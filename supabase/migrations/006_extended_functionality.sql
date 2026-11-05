-- Extended relation skeletons live in 001 to validate forward composite FKs immediately.
-- This migration wires profile creation, immutable tenant IDs, database invariants and audit history.
CREATE FUNCTION private.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 INSERT INTO public.profiles(id,display_name) VALUES(new.id,coalesce(new.raw_user_meta_data->>'full_name','')) ON CONFLICT(id) DO NOTHING;
 RETURN new;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();
INSERT INTO public.profiles(id,display_name) SELECT id,coalesce(raw_user_meta_data->>'full_name','') FROM auth.users ON CONFLICT(id) DO NOTHING;

CREATE FUNCTION private.stamp_and_protect_identity()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF new.id IS DISTINCT FROM old.id OR (to_jsonb(new)->>'wedding_id') IS DISTINCT FROM (to_jsonb(old)->>'wedding_id') THEN RAISE EXCEPTION 'Record identity and wedding cannot be changed'; END IF;
 new.updated_at:=now(); RETURN new;
END $$;
DO $$ DECLARE t text; BEGIN
 FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename<>'audit_logs' LOOP
  EXECUTE format('CREATE TRIGGER protect_identity BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION private.stamp_and_protect_identity()',t);
 END LOOP;
END $$;

CREATE FUNCTION private.guard_last_owner()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF old.role='owner' AND (TG_OP='DELETE' OR new.role<>'owner') THEN
  PERFORM 1 FROM public.weddings WHERE id=old.wedding_id FOR UPDATE;
  IF (SELECT count(*) FROM public.wedding_members WHERE wedding_id=old.wedding_id AND role='owner')<=1 THEN RAISE EXCEPTION 'A wedding must retain an owner'; END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN old; END IF; RETURN new;
END $$;
CREATE TRIGGER retain_wedding_owner BEFORE UPDATE OR DELETE ON public.wedding_members FOR EACH ROW EXECUTE FUNCTION private.guard_last_owner();

CREATE FUNCTION private.guard_guest_allowance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE row_data jsonb; v_wedding uuid; v_group uuid; v_limit integer; v_count bigint;
BEGIN
 row_data:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(old) ELSE to_jsonb(new) END;
 v_wedding:=(row_data->>'wedding_id')::uuid;
 v_group:=CASE WHEN TG_TABLE_NAME='invitation_groups' THEN (row_data->>'id')::uuid ELSE (row_data->>'invitation_group_id')::uuid END;
 SELECT guest_allowance INTO v_limit FROM public.invitation_groups WHERE wedding_id=v_wedding AND id=v_group FOR UPDATE;
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT count(*) INTO v_count FROM public.guests WHERE wedding_id=v_wedding AND invitation_group_id=v_group;
 IF v_count>v_limit THEN RAISE EXCEPTION 'Invited guests exceed group allowance'; END IF;
 SELECT count(*) INTO v_count FROM public.rsvp_attendees WHERE wedding_id=v_wedding AND invitation_group_id=v_group;
 IF v_count>v_limit THEN RAISE EXCEPTION 'Guest allowance exceeded'; END IF;
 IF v_count>0 AND EXISTS(SELECT 1 FROM public.rsvps WHERE wedding_id=v_wedding AND invitation_group_id=v_group AND status='declined') THEN RAISE EXCEPTION 'Declined RSVP cannot contain attendees'; END IF;
 RETURN NULL;
END $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['invitation_groups','guests','rsvps','rsvp_attendees'] LOOP
  EXECUTE format('CREATE CONSTRAINT TRIGGER enforce_guest_allowance AFTER INSERT OR UPDATE OR DELETE ON public.%I DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION private.guard_guest_allowance()',t);
 END LOOP;
END $$;

CREATE FUNCTION private.guard_reservation_capacity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_required integer; v_reserved bigint; v_old_id uuid;
BEGIN
 IF TG_OP='UPDATE' AND new.wishlist_item_id<>old.wishlist_item_id THEN RAISE EXCEPTION 'Reservation item cannot change'; END IF;
 IF TG_OP='UPDATE' THEN v_old_id:=old.id; END IF;
 SELECT quantity_required INTO v_required FROM public.wishlist_items WHERE wedding_id=new.wedding_id AND id=new.wishlist_item_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Gift unavailable'; END IF;
 SELECT coalesce(sum(quantity),0) INTO v_reserved FROM public.gift_reservations WHERE wedding_id=new.wedding_id AND wishlist_item_id=new.wishlist_item_id AND status IN ('reserved','fulfilled') AND (v_old_id IS NULL OR id<>v_old_id);
 IF new.status IN ('reserved','fulfilled') AND v_reserved+new.quantity>v_required THEN RAISE EXCEPTION 'Insufficient quantity'; END IF;
 RETURN new;
END $$;
CREATE TRIGGER reservation_capacity BEFORE INSERT OR UPDATE ON public.gift_reservations FOR EACH ROW EXECUTE FUNCTION private.guard_reservation_capacity();
CREATE FUNCTION private.guard_item_quantity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF new.quantity_required<(SELECT coalesce(sum(quantity),0) FROM public.gift_reservations WHERE wedding_id=new.wedding_id AND wishlist_item_id=new.id AND status IN ('reserved','fulfilled')) THEN RAISE EXCEPTION 'Quantity is below active reservations'; END IF;
 RETURN new;
END $$;
CREATE TRIGGER item_quantity BEFORE UPDATE OF quantity_required ON public.wishlist_items FOR EACH ROW EXECUTE FUNCTION private.guard_item_quantity();

CREATE FUNCTION private.guard_seat_capacity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_capacity integer;
BEGIN
 -- Serialize capacity changes and assignments within the wedding, including table reassignments.
 PERFORM 1 FROM public.weddings WHERE id=new.wedding_id FOR UPDATE;
 SELECT capacity INTO v_capacity FROM public.seating_tables WHERE wedding_id=new.wedding_id AND id=new.seating_table_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Table unavailable'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.rsvp_attendees a JOIN public.rsvps r ON r.wedding_id=a.wedding_id AND r.id=a.rsvp_id WHERE a.wedding_id=new.wedding_id AND a.id=new.attendee_id AND r.status='attending') THEN RAISE EXCEPTION 'Only confirmed attendees may be seated'; END IF;
 IF (SELECT count(*) FROM public.seat_assignments WHERE wedding_id=new.wedding_id AND seating_table_id=new.seating_table_id AND attendee_id<>new.attendee_id)>=v_capacity THEN RAISE EXCEPTION 'Table is full'; END IF;
 RETURN new;
END $$;
CREATE TRIGGER seating_capacity BEFORE INSERT OR UPDATE ON public.seat_assignments FOR EACH ROW EXECUTE FUNCTION private.guard_seat_capacity();
CREATE FUNCTION private.guard_table_capacity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM 1 FROM public.weddings WHERE id=new.wedding_id FOR UPDATE;
 IF new.capacity<(SELECT count(*) FROM public.seat_assignments WHERE wedding_id=new.wedding_id AND seating_table_id=new.id) THEN RAISE EXCEPTION 'Table capacity is below assigned attendance'; END IF;
 RETURN new;
END $$;
CREATE TRIGGER table_capacity BEFORE UPDATE OF capacity ON public.seating_tables FOR EACH ROW EXECUTE FUNCTION private.guard_table_capacity();
CREATE FUNCTION public.unassign_seat(p_wedding_id uuid,p_attendee_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM private.assert_operator(p_wedding_id);
 PERFORM 1 FROM public.weddings WHERE id=p_wedding_id FOR UPDATE;
 DELETE FROM public.seat_assignments WHERE wedding_id=p_wedding_id AND attendee_id=p_attendee_id;
END $$;
REVOKE ALL ON FUNCTION public.unassign_seat(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.unassign_seat(uuid,uuid) TO authenticated,service_role;

CREATE FUNCTION public.gift_availability(p_wedding_id uuid)
RETURNS TABLE(item_id uuid,quantity_required integer,quantity_reserved bigint,quantity_remaining bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT i.id,i.quantity_required,coalesce(sum(r.quantity),0),i.quantity_required-coalesce(sum(r.quantity),0)
 FROM public.wishlist_items i LEFT JOIN public.gift_reservations r ON r.wedding_id=i.wedding_id AND r.wishlist_item_id=i.id AND r.status IN ('reserved','fulfilled')
 WHERE i.wedding_id=p_wedding_id AND i.is_active AND i.is_published AND public.is_published_wedding(i.wedding_id)
 AND (i.category_id IS NULL OR EXISTS(SELECT 1 FROM public.wishlist_categories c WHERE c.wedding_id=i.wedding_id AND c.id=i.category_id AND c.is_published))
 GROUP BY i.wedding_id,i.id;
$$;
REVOKE ALL ON FUNCTION public.gift_availability(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gift_availability(uuid) TO anon,authenticated,service_role;

CREATE FUNCTION private.audit_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE d jsonb; v_wedding uuid;
BEGIN
 d:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(old) ELSE to_jsonb(new) END;
 v_wedding:=CASE WHEN TG_TABLE_NAME='weddings' THEN (d->>'id')::uuid ELSE (d->>'wedding_id')::uuid END;
 INSERT INTO public.audit_logs(wedding_id,actor_id,action,entity_type,entity_id,metadata)
 VALUES(v_wedding,auth.uid(),lower(TG_OP),TG_TABLE_NAME,(d->>'id')::uuid,jsonb_build_object('database_role',auth.role()));
 -- No row payloads, invitation hashes, email credentials, or payment secrets enter audit metadata.
 IF TG_OP='DELETE' THEN RETURN old; END IF; RETURN new;
END $$;
DO $$ DECLARE t text; BEGIN
 FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT IN ('audit_logs','profiles') LOOP
  EXECUTE format('CREATE TRIGGER audit_change AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION private.audit_change()',t);
 END LOOP;
END $$;
CREATE FUNCTION private.protect_audit_history()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 -- Permit only nested FK anonymization when an Auth profile is removed.
 IF TG_OP='UPDATE' AND pg_trigger_depth()>1 AND old.actor_id IS NOT NULL AND new.actor_id IS NULL AND (to_jsonb(old)-'actor_id')=(to_jsonb(new)-'actor_id') THEN RETURN new; END IF;
 RAISE EXCEPTION 'Audit history is append-only';
END $$;
CREATE TRIGGER append_only_audit BEFORE UPDATE OR DELETE ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION private.protect_audit_history();
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC,anon,authenticated;
