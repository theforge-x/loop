ALTER TABLE public.notifications ADD COLUMN lease_token uuid, ADD COLUMN lease_expires_at timestamptz,
 ADD COLUMN delivery_status text NOT NULL DEFAULT 'pending' CHECK(delivery_status IN ('pending','delivered','bounced','complained','delayed','failed','suppressed')),
 ADD COLUMN delivery_updated_at timestamptz;
CREATE INDEX notification_worker_due ON public.notifications(next_attempt_at) WHERE status IN ('pending','failed','processing');
CREATE TABLE public.email_suppressions (
 wedding_id uuid NOT NULL REFERENCES public.weddings(id), email text NOT NULL, reason text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(wedding_id,email)
);
CREATE TABLE public.email_webhook_events (
 id text PRIMARY KEY, wedding_id uuid NOT NULL REFERENCES public.weddings(id), notification_id uuid NOT NULL REFERENCES public.notifications(id), event_type text NOT NULL, occurred_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_suppressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_suppressions,public.email_webhook_events FROM anon,authenticated;
GRANT SELECT ON public.email_suppressions,public.email_webhook_events TO authenticated;
GRANT ALL ON public.email_suppressions,public.email_webhook_events TO service_role;
CREATE POLICY suppressions_read ON public.email_suppressions FOR SELECT TO authenticated USING(public.has_wedding_role(wedding_id));
CREATE POLICY email_events_read ON public.email_webhook_events FOR SELECT TO authenticated USING(public.has_wedding_role(wedding_id));

CREATE FUNCTION public.claim_notification(p_id uuid,p_force boolean DEFAULT false)
RETURNS SETOF public.notifications LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 RETURN QUERY UPDATE public.notifications SET status='processing',attempts=attempts+1,lease_token=gen_random_uuid(),lease_expires_at=now()+interval '90 seconds'
 WHERE id=p_id AND attempts<8 AND ((status IN ('pending','failed') AND (p_force OR next_attempt_at<=now())) OR (status='processing' AND lease_expires_at<now()))
 RETURNING *;
END $$;
REVOKE ALL ON FUNCTION public.claim_notification(uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_notification(uuid,boolean) TO service_role;

CREATE FUNCTION public.apply_email_event(p_event_id text,p_provider_id text,p_event_type text,p_occurred_at timestamptz)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE n public.notifications; v_status text; inserted text;
BEGIN
 SELECT * INTO n FROM public.notifications WHERE provider_message_id=p_provider_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Notification provider ID not recorded yet'; END IF;
 v_status:=CASE p_event_type WHEN 'email.delivered' THEN 'delivered' WHEN 'email.bounced' THEN 'bounced' WHEN 'email.complained' THEN 'complained' WHEN 'email.delivery_delayed' THEN 'delayed' WHEN 'email.failed' THEN 'failed' WHEN 'email.suppressed' THEN 'suppressed' ELSE NULL END;
 IF v_status IS NULL THEN RETURN false; END IF;
 INSERT INTO public.email_webhook_events(id,wedding_id,notification_id,event_type,occurred_at) VALUES(p_event_id,n.wedding_id,n.id,p_event_type,p_occurred_at) ON CONFLICT(id) DO NOTHING RETURNING id INTO inserted;
 IF inserted IS NULL THEN RETURN false; END IF;
 -- Permanent negative outcomes cannot be undone by delayed or out-of-order delivery events.
 IF n.delivery_status NOT IN ('bounced','complained','suppressed') AND (n.delivery_updated_at IS NULL OR p_occurred_at>=n.delivery_updated_at) THEN
  UPDATE public.notifications SET delivery_status=v_status,delivery_updated_at=p_occurred_at WHERE id=n.id;
 END IF;
 IF v_status IN ('bounced','complained','suppressed') THEN
  UPDATE public.notifications SET delivery_status=v_status,delivery_updated_at=p_occurred_at WHERE id=n.id;
  INSERT INTO public.email_suppressions(wedding_id,email,reason) VALUES(n.wedding_id,lower(n.recipient_email),v_status) ON CONFLICT(wedding_id,email) DO NOTHING;
 END IF;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.apply_email_event(text,text,text,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_email_event(text,text,text,timestamptz) TO service_role;

CREATE FUNCTION public.queue_communication(p_wedding_id uuid,p_kind text,p_record_id uuid,p_groups uuid[])
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE gid uuid; g public.invitation_groups; n integer:=0; inserted uuid; scheduled timestamptz; message_payload jsonb;
BEGIN
 PERFORM private.assert_operator(p_wedding_id);
 IF cardinality(p_groups) NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'Choose 1 to 1000 groups'; END IF;
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
   VALUES(p_wedding_id,p_kind,g.contact_email,message_payload,scheduled,p_kind||':'||p_record_id::text||':'||gid::text)
   ON CONFLICT(wedding_id,deduplication_key) DO NOTHING RETURNING id INTO inserted;
  IF inserted IS NOT NULL THEN n:=n+1; END IF;
 END LOOP;
 RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.queue_communication(uuid,text,uuid,uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.queue_communication(uuid,text,uuid,uuid[]) TO authenticated;

CREATE FUNCTION public.lookup_checkin(p_wedding_id uuid,p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE g public.invitation_groups;
BEGIN
 PERFORM private.assert_operator(p_wedding_id);
 g:=private.resolve_invitation(p_token);
 IF g.wedding_id<>p_wedding_id THEN RAISE EXCEPTION 'Invitation unavailable'; END IF;
 RETURN jsonb_build_object('group_name',g.name,'attendees',coalesce((SELECT jsonb_agg(jsonb_build_object('id',a.id,'name',a.guest_name,'events',coalesce((SELECT jsonb_agg(jsonb_build_object('id',e.id,'title',e.title,'checked_in',EXISTS(SELECT 1 FROM public.check_ins c WHERE c.wedding_id=p_wedding_id AND c.attendee_id=a.id AND c.event_id=e.id))) FROM public.event_attendance ea JOIN public.events e ON e.wedding_id=ea.wedding_id AND e.id=ea.event_id WHERE ea.wedding_id=p_wedding_id AND ea.attendee_id=a.id),'[]'::jsonb))) FROM public.rsvp_attendees a WHERE a.wedding_id=p_wedding_id AND a.invitation_group_id=g.id),'[]'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.lookup_checkin(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.lookup_checkin(uuid,text) TO authenticated;
