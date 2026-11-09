-- Drafts are stored separately: public SELECT * must never expose unpublished edits.
CREATE TABLE public.content_drafts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 wedding_id uuid NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
 module text NOT NULL CHECK(module IN ('story_sections','events','faqs','travel_information','announcements','gallery_albums','gallery_images')),
 record_id uuid NOT NULL DEFAULT gen_random_uuid(),
 payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object'),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(wedding_id,module,record_id)
);
ALTER TABLE public.content_drafts ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.content_drafts TO authenticated;
CREATE POLICY drafts_read ON public.content_drafts FOR SELECT TO authenticated USING(public.has_wedding_role(wedding_id));
CREATE POLICY drafts_write ON public.content_drafts FOR ALL TO authenticated
 USING(public.has_wedding_role(wedding_id,CASE WHEN module IN ('events','announcements','gallery_albums','gallery_images') THEN ARRAY['owner','admin','coordinator']::public.member_role[] ELSE ARRAY['owner','admin']::public.member_role[] END))
 WITH CHECK(public.has_wedding_role(wedding_id,CASE WHEN module IN ('events','announcements','gallery_albums','gallery_images') THEN ARRAY['owner','admin','coordinator']::public.member_role[] ELSE ARRAY['owner','admin']::public.member_role[] END));
CREATE TRIGGER audit_change AFTER INSERT OR UPDATE OR DELETE ON public.content_drafts FOR EACH ROW EXECUTE FUNCTION private.audit_change();

CREATE FUNCTION public.publish_content(p_wedding_id uuid,p_draft_id uuid,p_publish boolean DEFAULT true)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE d public.content_drafts; cols text; target_wedding uuid;
BEGIN
 SELECT * INTO d FROM public.content_drafts WHERE wedding_id=p_wedding_id AND id=p_draft_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Draft unavailable'; END IF;
 PERFORM private.assert_operator(p_wedding_id,CASE WHEN d.module IN ('events','announcements','gallery_albums','gallery_images') THEN ARRAY['owner','admin','coordinator']::public.member_role[] ELSE ARRAY['owner','admin']::public.member_role[] END);
 -- Only catalog columns on the fixed allowlist table are used. Identity/tenant/metadata cannot be supplied in payload.
 EXECUTE format('SELECT wedding_id FROM public.%I WHERE id=$1',d.module) INTO target_wedding USING d.record_id;
 IF target_wedding IS NOT NULL AND target_wedding<>p_wedding_id THEN RAISE EXCEPTION 'Record unavailable'; END IF;
 SELECT string_agg(format('%I',column_name),',') INTO cols FROM information_schema.columns
 WHERE table_schema='public' AND table_name=d.module AND column_name NOT IN ('id','wedding_id','created_at','updated_at');
 EXECUTE format('INSERT INTO public.%1$I SELECT (jsonb_populate_record(NULL::public.%1$I,$1)).* ON CONFLICT(id) DO UPDATE SET (%2$s)=(SELECT %2$s FROM jsonb_populate_record(NULL::public.%1$I,$1))',d.module,cols)
 USING d.payload || jsonb_build_object('id',d.record_id,'wedding_id',p_wedding_id,'is_published',p_publish,'created_at',now(),'updated_at',now());
 DELETE FROM public.content_drafts WHERE id=d.id;
 RETURN d.record_id;
END $$;
REVOKE ALL ON FUNCTION public.publish_content(uuid,uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.publish_content(uuid,uuid,boolean) TO authenticated;

CREATE FUNCTION public.publish_website(p_wedding_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE d public.site_settings; ident jsonb;
BEGIN
 PERFORM private.assert_operator(p_wedding_id,ARRAY['owner','admin']::public.member_role[]);
 PERFORM 1 FROM public.weddings WHERE id=p_wedding_id FOR UPDATE;
 SELECT * INTO d FROM public.site_settings WHERE wedding_id=p_wedding_id AND NOT is_published FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Save a website draft first'; END IF;
 ident:=d.content->'identity';
 IF ident IS NOT NULL THEN
  IF length(btrim(ident->>'partner_one_name')) NOT BETWEEN 1 AND 200 OR length(btrim(ident->>'partner_two_name')) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'Partner names required'; END IF;
  UPDATE public.weddings SET partner_one_name=ident->>'partner_one_name',partner_two_name=ident->>'partner_two_name',title=ident->>'title',wedding_date=nullif(ident->>'wedding_date','')::timestamptz,timezone=ident->>'timezone' WHERE id=p_wedding_id;
 END IF;
 INSERT INTO public.site_settings(wedding_id,content,theme,is_published) VALUES(p_wedding_id,d.content,d.theme,true)
 ON CONFLICT(wedding_id,is_published) DO UPDATE SET content=excluded.content,theme=excluded.theme;
 UPDATE public.weddings SET is_published=true WHERE id=p_wedding_id;
END $$;
REVOKE ALL ON FUNCTION public.publish_website(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.publish_website(uuid) TO authenticated;

-- Serialize membership changes so concurrent removals cannot orphan a wedding.
CREATE FUNCTION private.guard_membership()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE wid uuid;
BEGIN
 wid:=CASE WHEN TG_OP='DELETE' THEN old.wedding_id ELSE new.wedding_id END;
 IF TG_OP='UPDATE' AND (new.wedding_id<>old.wedding_id OR new.profile_id<>old.profile_id) THEN RAISE EXCEPTION 'Membership identity cannot change'; END IF;
 PERFORM 1 FROM public.weddings WHERE id=wid FOR UPDATE;
 IF TG_OP IN ('DELETE','UPDATE') AND old.role='owner' AND (TG_OP='DELETE' OR new.role<>'owner') THEN
  IF NOT EXISTS(SELECT 1 FROM public.wedding_members WHERE wedding_id=wid AND role='owner' AND id<>old.id) THEN RAISE EXCEPTION 'Keep at least one owner'; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN old; END IF; RETURN new;
END $$;
CREATE TRIGGER protect_owner BEFORE UPDATE OR DELETE ON public.wedding_members FOR EACH ROW EXECUTE FUNCTION private.guard_membership();
REVOKE ALL ON FUNCTION private.guard_membership() FROM PUBLIC,anon,authenticated;
