-- All privileged routines use qualified identifiers and a fixed safe search_path.
CREATE FUNCTION private.assert_operator(p_wedding_id uuid, p_roles public.member_role[] DEFAULT ARRAY['owner','admin','coordinator']::public.member_role[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF coalesce(auth.role(),'') <> 'service_role' AND NOT public.has_wedding_role(p_wedding_id,p_roles) THEN
  RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501';
 END IF;
END $$;

CREATE FUNCTION public.create_wedding(p_slug text,p_title text,p_partner_one text,p_partner_two text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 INSERT INTO public.weddings(slug,title,partner_one_name,partner_two_name,created_by)
 VALUES(p_slug,p_title,p_partner_one,p_partner_two,auth.uid()) RETURNING id INTO v_id;
 INSERT INTO public.wedding_members(wedding_id,profile_id,role) VALUES(v_id,auth.uid(),'owner');
 INSERT INTO public.site_settings(wedding_id) VALUES(v_id);
 RETURN v_id;
END $$;

CREATE FUNCTION public.issue_invitation(p_wedding_id uuid,p_group_id uuid,p_expires_at timestamptz)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_token text := encode(extensions.gen_random_bytes(32),'hex');
BEGIN
 PERFORM private.assert_operator(p_wedding_id);
 IF p_expires_at IS NULL OR p_expires_at<=now() THEN RAISE EXCEPTION 'Expiry must be in the future'; END IF;
 UPDATE public.invitation_groups SET token_hash=encode(extensions.digest(v_token,'sha256'),'hex'),token_expires_at=p_expires_at,token_revoked_at=NULL
 WHERE wedding_id=p_wedding_id AND id=p_group_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Invitation unavailable'; END IF;
 RETURN v_token;
END $$;

CREATE FUNCTION private.resolve_invitation(p_token text)
RETURNS public.invitation_groups LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_group public.invitation_groups;
BEGIN
 IF p_token IS NULL OR length(p_token) NOT BETWEEN 43 AND 256 THEN RAISE EXCEPTION 'Invitation unavailable'; END IF;
 SELECT * INTO v_group FROM public.invitation_groups
 WHERE token_hash=encode(extensions.digest(p_token,'sha256'),'hex') AND token_revoked_at IS NULL AND token_expires_at>now() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Invitation unavailable'; END IF;
 RETURN v_group;
END $$;

CREATE FUNCTION public.get_invitation(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE g public.invitation_groups;
BEGIN
 g:=private.resolve_invitation(p_token);
 RETURN jsonb_build_object('id',g.id,'wedding_id',g.wedding_id,'name',g.name,'allowance',g.guest_allowance,
 'guests',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'name',name)) FROM public.guests WHERE wedding_id=g.wedding_id AND invitation_group_id=g.id),'[]'::jsonb),
 'events',coalesce((SELECT jsonb_agg(jsonb_build_object('id',e.id,'title',e.title,'starts_at',e.starts_at,'venue_name',e.venue_name)) FROM public.events e WHERE e.wedding_id=g.wedding_id AND e.is_published AND (NOT e.is_private OR EXISTS(SELECT 1 FROM public.invitation_group_events i WHERE i.wedding_id=e.wedding_id AND i.event_id=e.id AND i.invitation_group_id=g.id))),'[]'::jsonb));
END $$;

CREATE FUNCTION private.record_rsvp(p_wedding_id uuid,p_group_id uuid,p_status public.rsvp_status,p_attendees jsonb,p_event_ids uuid[],p_dietary text,p_accessibility text,p_message text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE g public.invitation_groups; v_rsvp uuid; a jsonb; v_attendee uuid; v_index integer:=0;
BEGIN
 SELECT * INTO g FROM public.invitation_groups WHERE wedding_id=p_wedding_id AND id=p_group_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Invitation unavailable'; END IF;
 IF jsonb_typeof(p_attendees) IS DISTINCT FROM 'array' OR p_status IS NULL THEN RAISE EXCEPTION 'Invalid RSVP'; END IF;
 IF length(coalesce(p_dietary,''))>4000 OR length(coalesce(p_accessibility,''))>4000 OR length(coalesce(p_message,''))>4000 THEN RAISE EXCEPTION 'Response too long'; END IF;
 IF p_status='attending' AND jsonb_array_length(p_attendees) NOT BETWEEN 1 AND g.guest_allowance THEN RAISE EXCEPTION 'Guest allowance exceeded'; END IF;
 IF p_status='declined' AND (jsonb_array_length(p_attendees)<>0 OR cardinality(coalesce(p_event_ids,'{}'::uuid[]))<>0) THEN RAISE EXCEPTION 'Declined RSVP cannot contain attendees or events'; END IF;
 IF EXISTS(SELECT 1 FROM unnest(coalesce(p_event_ids,'{}'::uuid[])) x(id) WHERE NOT EXISTS(
  SELECT 1 FROM public.events e WHERE e.id=x.id AND e.wedding_id=p_wedding_id AND e.is_published AND
  (NOT e.is_private OR EXISTS(SELECT 1 FROM public.invitation_group_events i WHERE i.wedding_id=p_wedding_id AND i.event_id=e.id AND i.invitation_group_id=p_group_id)))) THEN RAISE EXCEPTION 'Event unavailable'; END IF;
 INSERT INTO public.rsvps(wedding_id,invitation_group_id,status,dietary_requirements,accessibility_requirements,message)
 VALUES(p_wedding_id,p_group_id,p_status,p_dietary,p_accessibility,p_message)
 ON CONFLICT(wedding_id,invitation_group_id) DO UPDATE SET status=excluded.status,dietary_requirements=excluded.dietary_requirements,accessibility_requirements=excluded.accessibility_requirements,message=excluded.message,responded_at=now()
 RETURNING id INTO v_rsvp;
 -- Check-ins and seating retain attendee history through RESTRICT foreign keys.
 DELETE FROM public.rsvp_attendees WHERE wedding_id=p_wedding_id AND rsvp_id=v_rsvp;
 FOR a IN SELECT value FROM jsonb_array_elements(p_attendees) LOOP
  INSERT INTO public.rsvp_attendees(wedding_id,rsvp_id,invitation_group_id,guest_id,guest_name,is_primary,attendee_type)
  VALUES(p_wedding_id,v_rsvp,p_group_id,nullif(a->>'guest_id','')::uuid,btrim(a->>'name'),v_index=0,coalesce(a->>'type','guest')) RETURNING id INTO v_attendee;
  INSERT INTO public.event_attendance(wedding_id,event_id,rsvp_id,attendee_id)
  SELECT p_wedding_id,id,v_rsvp,v_attendee FROM (SELECT DISTINCT unnest(coalesce(p_event_ids,'{}'::uuid[])) AS id) ids;
  v_index:=v_index+1;
 END LOOP;
 RETURN v_rsvp;
END $$;

CREATE FUNCTION public.submit_rsvp(p_token text,p_status public.rsvp_status,p_attendees jsonb,p_event_ids uuid[] DEFAULT '{}',p_dietary text DEFAULT NULL,p_accessibility text DEFAULT NULL,p_message text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE g public.invitation_groups;
BEGIN
 g:=private.resolve_invitation(p_token);
 RETURN private.record_rsvp(g.wedding_id,g.id,p_status,p_attendees,p_event_ids,p_dietary,p_accessibility,p_message);
END $$;
CREATE FUNCTION public.record_rsvp(p_wedding_id uuid,p_group_id uuid,p_status public.rsvp_status,p_attendees jsonb,p_event_ids uuid[] DEFAULT '{}',p_dietary text DEFAULT NULL,p_accessibility text DEFAULT NULL,p_message text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM private.assert_operator(p_wedding_id);
 RETURN private.record_rsvp(p_wedding_id,p_group_id,p_status,p_attendees,p_event_ids,p_dietary,p_accessibility,p_message);
END $$;

CREATE FUNCTION public.reserve_gift(p_wedding_id uuid,p_item_id uuid,p_quantity integer,p_name text DEFAULT NULL,p_email text DEFAULT NULL,p_message text DEFAULT NULL,p_reveal_identity boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_required integer; v_reserved bigint; v_id uuid; v_token text:=encode(extensions.gen_random_bytes(32),'hex');
BEGIN
 IF p_quantity IS NULL OR p_quantity NOT BETWEEN 1 AND 100000 OR length(coalesce(p_name,''))>200 OR length(coalesce(p_email,''))>320 OR length(coalesce(p_message,''))>4000 THEN RAISE EXCEPTION 'Invalid reservation'; END IF;
 SELECT i.quantity_required INTO v_required FROM public.wishlist_items i
 WHERE i.id=p_item_id AND i.wedding_id=p_wedding_id AND i.is_active AND i.is_published AND public.is_published_wedding(i.wedding_id)
 AND (i.category_id IS NULL OR EXISTS(SELECT 1 FROM public.wishlist_categories c WHERE c.wedding_id=i.wedding_id AND c.id=i.category_id AND c.is_published)) FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Gift unavailable'; END IF;
 SELECT coalesce(sum(quantity),0) INTO v_reserved FROM public.gift_reservations WHERE wedding_id=p_wedding_id AND wishlist_item_id=p_item_id AND status IN ('reserved','fulfilled');
 IF v_reserved+p_quantity>v_required THEN RAISE EXCEPTION 'Insufficient quantity'; END IF;
 INSERT INTO public.gift_reservations(wedding_id,wishlist_item_id,quantity,name,email,message,reveal_identity,cancellation_token_hash,expires_at)
 VALUES(p_wedding_id,p_item_id,p_quantity,p_name,p_email,p_message,p_reveal_identity,encode(extensions.digest(v_token,'sha256'),'hex'),now()+interval '7 days') RETURNING id INTO v_id;
 RETURN jsonb_build_object('id',v_id,'cancellation_token',v_token);
END $$;
CREATE FUNCTION public.cancel_gift_reservation(p_token text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.gift_reservations;
BEGIN
 SELECT * INTO r FROM public.gift_reservations WHERE cancellation_token_hash=encode(extensions.digest(p_token,'sha256'),'hex');
 IF NOT FOUND THEN RAISE EXCEPTION 'Reservation unavailable'; END IF;
 PERFORM 1 FROM public.wishlist_items WHERE wedding_id=r.wedding_id AND id=r.wishlist_item_id FOR UPDATE;
 SELECT * INTO r FROM public.gift_reservations WHERE id=r.id FOR UPDATE;
 IF r.status='fulfilled' THEN RAISE EXCEPTION 'Fulfilled reservations cannot be cancelled'; END IF;
 UPDATE public.gift_reservations SET status='cancelled' WHERE id=r.id;
END $$;
CREATE FUNCTION public.set_reservation_status(p_wedding_id uuid,p_reservation_id uuid,p_status public.reservation_status)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.gift_reservations;
BEGIN
 PERFORM private.assert_operator(p_wedding_id);
 SELECT * INTO r FROM public.gift_reservations WHERE wedding_id=p_wedding_id AND id=p_reservation_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Reservation unavailable'; END IF;
 PERFORM 1 FROM public.wishlist_items WHERE wedding_id=p_wedding_id AND id=r.wishlist_item_id FOR UPDATE;
 UPDATE public.gift_reservations SET status=p_status,fulfilled_at=CASE WHEN p_status='fulfilled' THEN now() ELSE NULL END WHERE wedding_id=p_wedding_id AND id=p_reservation_id;
END $$;

CREATE FUNCTION public.check_in_attendee(p_wedding_id uuid,p_event_id uuid,p_attendee_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid;
BEGIN
 PERFORM private.assert_operator(p_wedding_id);
 PERFORM 1 FROM public.event_attendance WHERE wedding_id=p_wedding_id AND event_id=p_event_id AND attendee_id=p_attendee_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Attendee is not eligible for this event'; END IF;
 INSERT INTO public.check_ins(wedding_id,event_id,attendee_id,coordinator_id) VALUES(p_wedding_id,p_event_id,p_attendee_id,auth.uid())
 ON CONFLICT(wedding_id,event_id,attendee_id) DO NOTHING RETURNING id INTO v_id;
 IF v_id IS NULL THEN SELECT id INTO v_id FROM public.check_ins WHERE wedding_id=p_wedding_id AND event_id=p_event_id AND attendee_id=p_attendee_id; END IF;
 RETURN v_id;
END $$;
CREATE FUNCTION public.assign_seat(p_wedding_id uuid,p_table_id uuid,p_attendee_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid;
BEGIN
 PERFORM private.assert_operator(p_wedding_id);
 PERFORM 1 FROM public.weddings WHERE id=p_wedding_id FOR UPDATE;
 INSERT INTO public.seat_assignments(wedding_id,seating_table_id,attendee_id) VALUES(p_wedding_id,p_table_id,p_attendee_id)
 ON CONFLICT(wedding_id,attendee_id) DO UPDATE SET seating_table_id=excluded.seating_table_id RETURNING id INTO v_id;
 RETURN v_id;
END $$;

-- The trusted server must verify signature and provider transaction independently before this RPC.
-- Database checks enforce amount/currency/reference matching and replay safety, not HTTP verification.
CREATE FUNCTION public.apply_verified_payment(p_event_id text,p_reference text,p_amount_minor bigint,p_currency text,p_transaction_id text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c public.contributions; v_existing public.payment_webhook_events;
BEGIN
 IF length(coalesce(p_event_id,'')) NOT BETWEEN 1 AND 200 OR length(coalesce(p_transaction_id,'')) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'Invalid provider identifiers'; END IF;
 SELECT * INTO c FROM public.contributions WHERE reference=p_reference FOR UPDATE;
 IF NOT FOUND OR c.amount_minor IS DISTINCT FROM p_amount_minor OR c.currency IS DISTINCT FROM p_currency THEN RAISE EXCEPTION 'Payment does not match contribution'; END IF;
 SELECT * INTO v_existing FROM public.payment_webhook_events WHERE provider='paystack' AND provider_event_id=p_event_id;
 IF FOUND THEN
  IF v_existing.contribution_id<>c.id THEN RAISE EXCEPTION 'Provider event conflicts with contribution'; END IF;
  RETURN false;
 END IF;
 IF c.status='successful' AND c.provider_transaction_id IS DISTINCT FROM p_transaction_id THEN RAISE EXCEPTION 'Contribution already credited'; END IF;
 IF c.status<>'successful' THEN UPDATE public.contributions SET status='successful',provider_transaction_id=p_transaction_id,verified_at=now() WHERE id=c.id; END IF;
 INSERT INTO public.payment_webhook_events(wedding_id,provider,provider_event_id,payment_reference,contribution_id) VALUES(c.wedding_id,'paystack',p_event_id,p_reference,c.id);
 RETURN true;
END $$;

-- Revoke the automatic PUBLIC function grant explicitly, including private helpers.
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.create_wedding(text,text,text,text),public.issue_invitation(uuid,uuid,timestamptz),public.get_invitation(text),public.submit_rsvp(text,public.rsvp_status,jsonb,uuid[],text,text,text),public.record_rsvp(uuid,uuid,public.rsvp_status,jsonb,uuid[],text,text,text),public.reserve_gift(uuid,uuid,integer,text,text,text,boolean),public.cancel_gift_reservation(text),public.set_reservation_status(uuid,uuid,public.reservation_status),public.check_in_attendee(uuid,uuid,uuid),public.assign_seat(uuid,uuid,uuid),public.apply_verified_payment(text,text,bigint,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_wedding(text,text,text,text),public.issue_invitation(uuid,uuid,timestamptz),public.record_rsvp(uuid,uuid,public.rsvp_status,jsonb,uuid[],text,text,text),public.set_reservation_status(uuid,uuid,public.reservation_status),public.check_in_attendee(uuid,uuid,uuid),public.assign_seat(uuid,uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.issue_invitation(uuid,uuid,timestamptz),public.get_invitation(text),public.submit_rsvp(text,public.rsvp_status,jsonb,uuid[],text,text,text),public.record_rsvp(uuid,uuid,public.rsvp_status,jsonb,uuid[],text,text,text),public.reserve_gift(uuid,uuid,integer,text,text,text,boolean),public.cancel_gift_reservation(text),public.set_reservation_status(uuid,uuid,public.reservation_status),public.check_in_attendee(uuid,uuid,uuid),public.assign_seat(uuid,uuid,uuid),public.apply_verified_payment(text,text,bigint,text,text) TO service_role;
