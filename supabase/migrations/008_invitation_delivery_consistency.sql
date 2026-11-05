-- Re-queueing a deduplicated, already-sent job must not regress delivery analytics.
CREATE OR REPLACE FUNCTION public.queue_invitation(p_wedding_id uuid,p_group_id uuid)
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
 UPDATE public.invitation_groups SET delivery_status=CASE WHEN (SELECT status FROM public.notifications WHERE id=v_id)='sent' THEN 'sent' ELSE 'queued' END WHERE wedding_id=p_wedding_id AND id=p_group_id;
 RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.queue_invitation(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.queue_invitation(uuid,uuid) TO authenticated,service_role;
