ALTER TABLE public.invitation_groups ADD CONSTRAINT invitation_group_name_length CHECK(length(btrim(name)) BETWEEN 1 AND 200);
CREATE UNIQUE INDEX invitation_group_labels ON public.invitation_groups(wedding_id,lower(btrim(name)));

CREATE TABLE private.request_rate_limits (
 key_hash text PRIMARY KEY CHECK(key_hash ~ '^[0-9a-f]{64}$'),
 window_started_at timestamptz NOT NULL, expires_at timestamptz NOT NULL,
 hits integer NOT NULL CHECK(hits>0)
);
ALTER TABLE private.request_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE INDEX rate_limit_expiry ON private.request_rate_limits(expires_at);
CREATE FUNCTION public.consume_rate_limit(p_key_hash text,p_limit integer,p_window_seconds integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_start timestamptz; v_hits integer;
BEGIN
 IF p_key_hash !~ '^[0-9a-f]{64}$' OR p_limit NOT BETWEEN 1 AND 10000 OR p_window_seconds NOT BETWEEN 1 AND 86400 THEN RAISE EXCEPTION 'Invalid rate limit'; END IF;
 v_start:=to_timestamp(floor(extract(epoch FROM now())/p_window_seconds)*p_window_seconds);
 INSERT INTO private.request_rate_limits(key_hash,window_started_at,expires_at,hits) VALUES(p_key_hash,v_start,v_start+make_interval(secs=>p_window_seconds),1)
 ON CONFLICT(key_hash) DO UPDATE SET
 hits=CASE WHEN request_rate_limits.window_started_at<excluded.window_started_at THEN 1 ELSE least(request_rate_limits.hits+1,p_limit+1) END,
 window_started_at=excluded.window_started_at,expires_at=excluded.expires_at RETURNING hits INTO v_hits;
 RETURN v_hits<=p_limit;
END $$;
REVOKE ALL ON FUNCTION public.consume_rate_limit(text,integer,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text,integer,integer) TO service_role;

CREATE FUNCTION public.import_guests(p_wedding_id uuid,p_rows jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE row_data jsonb; v_group uuid; v_guest uuid; v_name text; v_allowance integer; v_added integer:=0; v_updated integer:=0; v_groups integer:=0;
BEGIN
 PERFORM private.assert_operator(p_wedding_id);
 IF jsonb_typeof(p_rows) IS DISTINCT FROM 'array' OR jsonb_array_length(p_rows) NOT BETWEEN 1 AND 1000 OR octet_length(p_rows::text)>2097152 THEN RAISE EXCEPTION 'Import must contain 1–1000 rows within 2 MiB'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_rows) r WHERE nullif(r->>'guest_id','') IS NOT NULL GROUP BY r->>'guest_id' HAVING count(*)>1) THEN RAISE EXCEPTION 'Duplicate guest IDs in import'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_rows) r GROUP BY coalesce(nullif(r->>'group_id',''),lower(btrim(r->>'group_name'))) HAVING count(DISTINCT nullif(r->>'group_allowance',''))>1) THEN RAISE EXCEPTION 'Conflicting group allowances'; END IF;
 PERFORM 1 FROM public.weddings WHERE id=p_wedding_id FOR UPDATE;
 FOR row_data IN SELECT value FROM jsonb_array_elements(p_rows) LOOP
  v_name:=btrim(row_data->>'guest_name');
  IF v_name IS NULL OR length(v_name) NOT BETWEEN 1 AND 200 OR length(coalesce(row_data->>'email',''))>320 THEN RAISE EXCEPTION 'Invalid guest row'; END IF;
  v_allowance:=nullif(row_data->>'group_allowance','')::integer;
  IF v_allowance IS NOT NULL AND v_allowance NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'Invalid group allowance'; END IF;
  IF nullif(row_data->>'group_id','') IS NOT NULL THEN
   SELECT id INTO v_group FROM public.invitation_groups WHERE wedding_id=p_wedding_id AND id=(row_data->>'group_id')::uuid;
   IF NOT FOUND THEN RAISE EXCEPTION 'Invitation group unavailable'; END IF;
  ELSE
   IF length(coalesce(btrim(row_data->>'group_name'),'')) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'Group name required'; END IF;
   SELECT id INTO v_group FROM public.invitation_groups WHERE wedding_id=p_wedding_id AND lower(btrim(name))=lower(btrim(row_data->>'group_name'));
   IF NOT FOUND THEN
    INSERT INTO public.invitation_groups(wedding_id,name,guest_allowance) VALUES(p_wedding_id,btrim(row_data->>'group_name'),coalesce(v_allowance,1)) RETURNING id INTO v_group;
    v_groups:=v_groups+1;
   END IF;
  END IF;
  IF v_allowance IS NOT NULL THEN UPDATE public.invitation_groups SET guest_allowance=v_allowance WHERE wedding_id=p_wedding_id AND id=v_group; END IF;
  v_guest:=nullif(row_data->>'guest_id','')::uuid;
  IF v_guest IS NULL THEN
   INSERT INTO public.guests(wedding_id,invitation_group_id,name,email) VALUES(p_wedding_id,v_group,v_name,nullif(btrim(row_data->>'email'),'')); v_added:=v_added+1;
  ELSE
   UPDATE public.guests SET name=v_name,email=nullif(btrim(row_data->>'email'),'') WHERE wedding_id=p_wedding_id AND invitation_group_id=v_group AND id=v_guest;
   IF NOT FOUND THEN RAISE EXCEPTION 'Guest unavailable in invitation group'; END IF;
   v_updated:=v_updated+1;
  END IF;
 END LOOP;
 RETURN jsonb_build_object('added',v_added,'updated',v_updated,'groups_created',v_groups);
END $$;
REVOKE ALL ON FUNCTION public.import_guests(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.import_guests(uuid,jsonb) TO authenticated,service_role;

CREATE FUNCTION public.queue_invitation(p_wedding_id uuid,p_group_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE g public.invitation_groups; v_id uuid; v_key text;
BEGIN
 PERFORM private.assert_operator(p_wedding_id);
 SELECT * INTO g FROM public.invitation_groups WHERE wedding_id=p_wedding_id AND id=p_group_id FOR UPDATE;
 IF NOT FOUND OR g.contact_email IS NULL OR position('@' IN g.contact_email)<2 THEN RAISE EXCEPTION 'A valid invitation contact email is required'; END IF;
 v_key:='invitation:'||g.id||':'||date_trunc('minute',now())::text;
 INSERT INTO public.notifications(wedding_id,notification_type,recipient_email,payload,deduplication_key)
 VALUES(p_wedding_id,'invitation',g.contact_email,jsonb_build_object('group_id',g.id),v_key)
 ON CONFLICT(wedding_id,deduplication_key) DO NOTHING RETURNING id INTO v_id;
 IF v_id IS NULL THEN SELECT id INTO v_id FROM public.notifications WHERE wedding_id=p_wedding_id AND deduplication_key=v_key; END IF;
 UPDATE public.invitation_groups SET delivery_status='queued' WHERE wedding_id=p_wedding_id AND id=p_group_id;
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.queue_invitation(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.queue_invitation(uuid,uuid) TO authenticated,service_role;

CREATE FUNCTION private.queue_rsvp_confirmation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_email text;
BEGIN
 SELECT contact_email INTO v_email FROM public.invitation_groups WHERE wedding_id=new.wedding_id AND id=new.invitation_group_id;
 IF nullif(v_email,'') IS NOT NULL THEN
  INSERT INTO public.notifications(wedding_id,notification_type,recipient_email,payload,deduplication_key)
  VALUES(new.wedding_id,'rsvp_confirmation',v_email,jsonb_build_object('rsvp_id',new.id,'status',new.status),'rsvp:'||new.id||':'||new.responded_at::text)
  ON CONFLICT(wedding_id,deduplication_key) DO NOTHING;
 END IF;
 RETURN new;
END $$;
CREATE TRIGGER queue_rsvp_confirmation AFTER INSERT OR UPDATE ON public.rsvps FOR EACH ROW EXECUTE FUNCTION private.queue_rsvp_confirmation();
REVOKE ALL ON FUNCTION private.queue_rsvp_confirmation() FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.guest_overview(p_wedding_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_groups bigint; v_issued bigint; v_responses bigint;
BEGIN
 IF coalesce(auth.role(),'')<>'service_role' AND NOT public.has_wedding_role(p_wedding_id) THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
 SELECT count(*),count(*) FILTER(WHERE token_hash IS NOT NULL) INTO v_groups,v_issued FROM public.invitation_groups WHERE wedding_id=p_wedding_id;
 SELECT count(*) INTO v_responses FROM public.rsvps r JOIN public.invitation_groups g ON g.wedding_id=r.wedding_id AND g.id=r.invitation_group_id WHERE r.wedding_id=p_wedding_id AND g.token_hash IS NOT NULL;
 RETURN jsonb_build_object('invitation_groups',v_groups,'issued_groups',v_issued,'responses_to_issued',v_responses,
 'invited_allowance',(SELECT coalesce(sum(guest_allowance),0) FROM public.invitation_groups WHERE wedding_id=p_wedding_id),
 'confirmed_attendees',(SELECT count(*) FROM public.rsvp_attendees WHERE wedding_id=p_wedding_id),
 'declined_groups',(SELECT count(*) FROM public.rsvps WHERE wedding_id=p_wedding_id AND status='declined'),
 'pending_groups',v_groups-(SELECT count(*) FROM public.rsvps WHERE wedding_id=p_wedding_id),
 'sent_groups',(SELECT count(*) FROM public.invitation_groups WHERE wedding_id=p_wedding_id AND delivery_status='sent'));
END $$;
REVOKE ALL ON FUNCTION public.guest_overview(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.guest_overview(uuid) TO authenticated,service_role;
