-- Tenant operators edit invitation content; token/delivery integrity stays behind restricted routines.
REVOKE INSERT,UPDATE ON public.invitation_groups FROM authenticated;
GRANT INSERT(wedding_id,name,contact_email,guest_allowance) ON public.invitation_groups TO authenticated;
GRANT UPDATE(name,contact_email,guest_allowance) ON public.invitation_groups TO authenticated;
CREATE FUNCTION public.revoke_invitation(p_wedding_id uuid,p_group_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM private.assert_operator(p_wedding_id);
 UPDATE public.invitation_groups SET token_revoked_at=now() WHERE wedding_id=p_wedding_id AND id=p_group_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Invitation unavailable'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.revoke_invitation(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.revoke_invitation(uuid,uuid) TO authenticated,service_role;
