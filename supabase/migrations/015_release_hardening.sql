CREATE TRIGGER protect_identity BEFORE UPDATE ON public.content_drafts FOR EACH ROW EXECUTE FUNCTION private.stamp_and_protect_identity();
-- Replace the older owner trigger with the stricter membership identity/owner guard in 011.
DROP TRIGGER retain_wedding_owner ON public.wedding_members;
DROP FUNCTION private.guard_last_owner();
-- Processing jobs from before leases were introduced must also be recoverable.
UPDATE public.notifications SET lease_expires_at=now()-interval '1 second' WHERE status='processing' AND lease_expires_at IS NULL;
-- Preserve the target invitation group so eligibility can be rechecked at send time.
CREATE OR REPLACE FUNCTION public.queue_communication(p_wedding_id uuid,p_kind text,p_record_id uuid,p_groups uuid[])
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE gid uuid; g public.invitation_groups; n integer:=0; inserted uuid; scheduled timestamptz; message_payload jsonb;
BEGIN
 PERFORM private.assert_operator(p_wedding_id);
 IF p_groups IS NULL OR cardinality(p_groups) NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'Choose 1 to 1000 groups'; END IF;
 IF p_kind='announcement' THEN
  SELECT publish_at INTO scheduled FROM public.announcements WHERE wedding_id=p_wedding_id AND id=p_record_id AND is_published;
  message_payload:=jsonb_build_object('announcement_id',p_record_id);
 ELSIF p_kind='event_reminder' THEN
  SELECT greatest(now(),starts_at-interval '24 hours') INTO scheduled FROM public.events WHERE wedding_id=p_wedding_id AND id=p_record_id AND is_published AND starts_at>now();
  message_payload:=jsonb_build_object('event_id',p_record_id);
 ELSE RAISE EXCEPTION 'Unsupported communication'; END IF;
 IF scheduled IS NULL THEN RAISE EXCEPTION 'Publish an eligible record first'; END IF;
 FOREACH gid IN ARRAY p_groups LOOP
  SELECT * INTO g FROM public.invitation_groups WHERE wedding_id=p_wedding_id AND id=gid;
  IF NOT FOUND OR g.contact_email IS NULL THEN RAISE EXCEPTION 'Every selected group needs a contact email'; END IF;
  IF p_kind='event_reminder' AND EXISTS(SELECT 1 FROM public.events e WHERE e.id=p_record_id AND e.is_private AND NOT EXISTS(SELECT 1 FROM public.invitation_group_events i WHERE i.wedding_id=p_wedding_id AND i.event_id=p_record_id AND i.invitation_group_id=gid)) THEN RAISE EXCEPTION 'Group is not eligible for this event'; END IF;
  INSERT INTO public.notifications(wedding_id,notification_type,recipient_email,payload,next_attempt_at,deduplication_key)
   VALUES(p_wedding_id,p_kind,g.contact_email,message_payload||jsonb_build_object('group_id',gid),scheduled,p_kind||':'||p_record_id::text||':'||gid::text)
   ON CONFLICT(wedding_id,deduplication_key) DO NOTHING RETURNING id INTO inserted;
  IF inserted IS NOT NULL THEN n:=n+1; END IF;
 END LOOP;
 RETURN n;
END $$;
CREATE FUNCTION public.publish_content_batch(p_wedding_id uuid,p_drafts uuid[])
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE draft uuid; n integer:=0;
BEGIN
 IF p_drafts IS NULL OR cardinality(p_drafts) NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'Choose 1 to 50 drafts'; END IF;
 FOREACH draft IN ARRAY p_drafts LOOP PERFORM public.publish_content(p_wedding_id,draft,true); n:=n+1; END LOOP;
 RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.publish_content_batch(uuid,uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.publish_content_batch(uuid,uuid[]) TO authenticated;
