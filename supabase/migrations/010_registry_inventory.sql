ALTER TABLE public.contributions ADD CONSTRAINT contribution_amount_safe_integer CHECK(amount_minor<=9007199254740991);
ALTER TABLE public.wishlist_items ADD CONSTRAINT gift_price_safe_integer CHECK(price_minor IS NULL OR price_minor<=9007199254740991);
CREATE FUNCTION public.registry_inventory(p_wedding_id uuid)
RETURNS TABLE(item_id uuid,quantity_reserved bigint,quantity_remaining bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF coalesce(auth.role(),'')<>'service_role' AND NOT public.has_wedding_role(p_wedding_id) THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT i.id,coalesce(sum(r.quantity),0),i.quantity_required-coalesce(sum(r.quantity),0)
 FROM public.wishlist_items i LEFT JOIN public.gift_reservations r ON r.wedding_id=i.wedding_id AND r.wishlist_item_id=i.id AND r.status IN ('reserved','fulfilled')
 WHERE i.wedding_id=p_wedding_id GROUP BY i.id;
END $$;
REVOKE ALL ON FUNCTION public.registry_inventory(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.registry_inventory(uuid) TO authenticated,service_role;
