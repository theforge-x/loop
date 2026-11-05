-- No exposed table relies on an implicit allow policy.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon,authenticated;
GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA private REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
CREATE FUNCTION public.has_wedding_role(p_wedding_id uuid, p_roles public.member_role[] DEFAULT ARRAY['owner','admin','coordinator','viewer']::public.member_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS(SELECT 1 FROM public.wedding_members m WHERE m.wedding_id=p_wedding_id AND m.profile_id=(SELECT auth.uid()) AND m.role=ANY(p_roles));
$$;
CREATE FUNCTION public.is_published_wedding(p_wedding_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS(SELECT 1 FROM public.weddings WHERE id=p_wedding_id AND is_published);
$$;
CREATE FUNCTION public.shares_wedding(p_profile_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS(SELECT 1 FROM public.wedding_members a JOIN public.wedding_members b ON a.wedding_id=b.wedding_id WHERE a.profile_id=(SELECT auth.uid()) AND b.profile_id=p_profile_id);
$$;
REVOKE ALL ON FUNCTION public.has_wedding_role(uuid,public.member_role[]), public.is_published_wedding(uuid), public.shares_wedding(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_wedding_role(uuid,public.member_role[]), public.is_published_wedding(uuid) TO anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.shares_wedding(uuid) TO authenticated,service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_read ON public.profiles FOR SELECT TO authenticated USING(id=(SELECT auth.uid()) OR public.shares_wedding(id));
CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated USING(id=(SELECT auth.uid())) WITH CHECK(id=(SELECT auth.uid()));
GRANT SELECT,UPDATE ON public.profiles TO authenticated;
ALTER TABLE public.weddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY weddings_public ON public.weddings FOR SELECT TO anon,authenticated USING(is_published);
CREATE POLICY weddings_member ON public.weddings FOR SELECT TO authenticated USING(public.has_wedding_role(id));
CREATE POLICY weddings_update ON public.weddings FOR UPDATE TO authenticated USING(public.has_wedding_role(id,ARRAY['owner','admin']::public.member_role[])) WITH CHECK(public.has_wedding_role(id,ARRAY['owner','admin']::public.member_role[]));
GRANT SELECT ON public.weddings TO anon,authenticated;
GRANT UPDATE ON public.weddings TO authenticated;

ALTER TABLE public.wedding_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY wedding_members_member_read ON public.wedding_members FOR SELECT TO authenticated USING(public.has_wedding_role(wedding_id));
GRANT SELECT ON public.wedding_members TO authenticated;
CREATE POLICY members_insert ON public.wedding_members FOR INSERT TO authenticated WITH CHECK((public.has_wedding_role(wedding_id,ARRAY['owner']::public.member_role[]) OR (public.has_wedding_role(wedding_id,ARRAY['admin']::public.member_role[]) AND role IN ('coordinator','viewer'))));
CREATE POLICY members_update ON public.wedding_members FOR UPDATE TO authenticated USING((public.has_wedding_role(wedding_id,ARRAY['owner']::public.member_role[]) OR (public.has_wedding_role(wedding_id,ARRAY['admin']::public.member_role[]) AND role IN ('coordinator','viewer')))) WITH CHECK((public.has_wedding_role(wedding_id,ARRAY['owner']::public.member_role[]) OR (public.has_wedding_role(wedding_id,ARRAY['admin']::public.member_role[]) AND role IN ('coordinator','viewer'))));
CREATE POLICY members_delete ON public.wedding_members FOR DELETE TO authenticated USING((public.has_wedding_role(wedding_id,ARRAY['owner']::public.member_role[]) OR (public.has_wedding_role(wedding_id,ARRAY['admin']::public.member_role[]) AND role IN ('coordinator','viewer'))));
GRANT INSERT,UPDATE,DELETE ON public.wedding_members TO authenticated;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY site_settings_member_read ON public.site_settings FOR SELECT TO authenticated USING(public.has_wedding_role(wedding_id));
GRANT SELECT ON public.site_settings TO authenticated;
CREATE POLICY site_settings_published_read ON public.site_settings FOR SELECT TO anon,authenticated USING(public.is_published_wedding(wedding_id) AND (is_published));
GRANT SELECT ON public.site_settings TO anon;
CREATE POLICY site_settings_insert ON public.site_settings FOR INSERT TO authenticated WITH CHECK(public.has_wedding_role(wedding_id,ARRAY['owner','admin']::public.member_role[]));
CREATE POLICY site_settings_update ON public.site_settings FOR UPDATE TO authenticated USING(public.has_wedding_role(wedding_id,ARRAY['owner','admin']::public.member_role[])) WITH CHECK(public.has_wedding_role(wedding_id,ARRAY['owner','admin']::public.member_role[]));
CREATE POLICY site_settings_delete ON public.site_settings FOR DELETE TO authenticated USING(public.has_wedding_role(wedding_id,ARRAY['owner','admin']::public.member_role[]));
GRANT INSERT,UPDATE,DELETE ON public.site_settings TO authenticated;

ALTER TABLE public.story_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY story_sections_member_read ON public.story_sections FOR SELECT TO authenticated USING(public.has_wedding_role(wedding_id));
GRANT SELECT ON public.story_sections TO authenticated;
CREATE POLICY story_sections_published_read ON public.story_sections FOR SELECT TO anon,authenticated USING(public.is_published_wedding(wedding_id) AND (is_published));
GRANT SELECT ON public.story_sections TO anon;
CREATE POLICY story_sections_insert ON public.story_sections FOR INSERT TO authenticated WITH CHECK(public.has_wedding_role(wedding_id,ARRAY['owner','admin']::public.member_role[]));
CREATE POLICY story_sections_update ON public.story_sections FOR UPDATE TO authenticated USING(public.has_wedding_role(wedding_id,ARRAY['owner','admin']::public.member_role[])) WITH CHECK(public.has_wedding_role(wedding_id,ARRAY['owner','admin']::public.member_role[]));
CREATE POLICY story_sections_delete ON public.story_sections FOR DELETE TO authenticated USING(public.has_wedding_role(wedding_id,ARRAY['owner','admin']::public.member_role[]));
GRANT INSERT,UPDATE,DELETE ON public.story_sections TO authenticated;

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY events_member_read ON public.events FOR SELECT TO authenticated USING(public.has_wedding_role(wedding_id));
GRANT SELECT ON public.events TO authenticated;
CREATE POLICY events_published_read ON public.events FOR SELECT TO anon,authenticated USING(public.is_published_wedding(wedding_id) AND (is_published AND NOT is_private));
GRANT SELECT ON public.events TO anon;
CREATE POLICY events_insert ON public.events FOR INSERT TO authenticated WITH CHECK(public.has_wedding_role(wedding_id,ARRAY['owner','admin','coordinator']::public.member_role[]));
CREATE POLICY events_update ON public.events FOR UPDATE TO authenticated USING(public.has_wedding_role(wedding_id,ARRAY['owner','admin','coordinator']::public.member_role[])) WITH CHECK(public.has_wedding_role(wedding_id,ARRAY['owner','admin','coordinator']::public.member_role[]));
CREATE POLICY events_delete ON public.events FOR DELETE TO authenticated USING(public.has_wedding_role(wedding_id,ARRAY['owner','admin','coordinator']::public.member_role[]));
GRANT INSERT,UPDATE,DELETE ON public.events TO authenticated;

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY faqs_member_read ON public.faqs FOR SELECT TO authenticated USING(public.has_wedding_role(wedding_id));
GRANT SELECT ON public.faqs TO authenticated;
CREATE POLICY faqs_published_read ON public.faqs FOR SELECT TO anon,authenticated USING(public.is_published_wedding(wedding_id) AND (is_published));
GRANT SELECT ON public.faqs TO anon;
CREATE POLICY faqs_insert ON public.faqs FOR INSERT TO authenticated WITH CHECK(public.has_wedding_role(wedding_id,ARRAY['owner','admin']::public.member_role[]));
CREATE POLICY faqs_update ON public.faqs FOR UPDATE TO authenticated USING(public.has_wedding_role(wedding_id,ARRAY['owner','admin']::public.member_role[])) WITH CHECK(public.has_wedding_role(wedding_id,ARRAY['owner','admin']::public.member_role[]));
CREATE POLICY faqs_delete ON public.faqs FOR DELETE TO authenticated USING(public.has_wedding_role(wedding_id,ARRAY['owner','admin']::public.member_role[]));
GRANT INSERT,UPDATE,DELETE ON public.faqs TO authenticated;

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY announcements_member_read ON public.announcements FOR SELECT TO authenticated USING(public.has_wedding_role(wedding_id));
GRANT SELECT ON public.announcements TO authenticated;
CREATE POLICY announcements_published_read ON public.announcements FOR SELECT TO anon,authenticated USING(public.is_published_wedding(wedding_id) AND (is_published AND publish_at<=now()));
GRANT SELECT ON public.announcements TO anon;
CREATE POLICY announcements_insert ON public.announcements FOR INSERT TO authenticated WITH CHECK(public.has_wedding_role(wedding_id,ARRAY['owner','admin','coordinator']::public.member_role[]));
CREATE POLICY announcements_update ON public.announcements FOR UPDATE TO authenticated USING(public.has_wedding_role(wedding_id,ARRAY['owner','admin','coordinator']::public.member_role[])) WITH CHECK(public.has_wedding_role(wedding_id,ARRAY['owner','admin','coordinator']::public.member_role[]));
CREATE POLICY announcements_delete ON public.announcements FOR DELETE TO authenticated USING(public.has_wedding_role(wedding_id,ARRAY['owner','admin','coordinator']::public.member_role[]));
GRANT INSERT,UPDATE,DELETE ON public.announcements TO authenticated;

ALTER TABLE public.travel_information ENABLE ROW LEVEL SECURITY;
CREATE POLICY travel_information_member_read ON public.travel_information FOR SELECT TO authenticated USING(public.has_wedding_role(wedding_id));
GRANT SELECT ON public.travel_information TO authenticated;
CREATE POLICY travel_information_published_read ON public.travel_information FOR SELECT TO anon,authenticated USING(public.is_published_wedding(wedding_id) AND (is_published));
GRANT SELECT ON public.travel_information TO anon;
CREATE POLICY travel_information_insert ON public.travel_information FOR INSERT TO authenticated WITH CHECK(public.has_wedding_role(wedding_id,ARRAY['owner','admin']::public.member_role[]));
CREATE POLICY travel_information_update ON public.travel_information FOR UPDATE TO authenticated USING(public.has_wedding_role(wedding_id,ARRAY['owner','admin']::public.member_role[])) WITH CHECK(public.has_wedding_role(wedding_id,ARRAY['owner','admin']::public.member_role[]));
CREATE POLICY travel_information_delete ON public.travel_information FOR DELETE TO authenticated USING(public.has_wedding_role(wedding_id,ARRAY['owner','admin']::public.member_role[]));
GRANT INSERT,UPDATE,DELETE ON public.travel_information TO authenticated;

ALTER TABLE public.invitation_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY invitation_groups_member_read ON public.invitation_groups FOR SELECT TO authenticated USING(public.has_wedding_role(wedding_id));
GRANT SELECT ON public.invitation_groups TO authenticated;
CREATE POLICY invitation_groups_insert ON public.invitation_groups FOR INSERT TO authenticated WITH CHECK(public.has_wedding_role(wedding_id,ARRAY['owner','admin','coordinator']::public.member_role[]));
CREATE POLICY invitation_groups_update ON public.invitation_groups FOR UPDATE TO authenticated USING(public.has_wedding_role(wedding_id,ARRAY['owner','admin','coordinator']::public.member_role[])) WITH CHECK(public.has_wedding_role(wedding_id,ARRAY['owner','admin','coordinator']::public.member_role[]));
CREATE POLICY invitation_groups_delete ON public.invitation_groups FOR DELETE TO authenticated USING(public.has_wedding_role(wedding_id,ARRAY['owner','admin','coordinator']::public.member_role[]));
GRANT INSERT,UPDATE,DELETE ON public.invitation_groups TO authenticated;

ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
CREATE POLICY guests_member_read ON public.guests FOR SELECT TO authenticated USING(public.has_wedding_role(wedding_id));
GRANT SELECT ON public.guests TO authenticated;
CREATE POLICY guests_insert ON public.guests FOR INSERT TO authenticated WITH CHECK(public.has_wedding_role(wedding_id,ARRAY['owner','admin','coordinator']::public.member_role[]));
CREATE POLICY guests_update ON public.guests FOR UPDATE TO authenticated USING(public.has_wedding_role(wedding_id,ARRAY['owner','admin','coordinator']::public.member_role[])) WITH CHECK(public.has_wedding_role(wedding_id,ARRAY['owner','admin','coordinator']::public.member_role[]));
CREATE POLICY guests_delete ON public.guests FOR DELETE TO authenticated USING(public.has_wedding_role(wedding_id,ARRAY['owner','admin','coordinator']::public.member_role[]));
GRANT INSERT,UPDATE,DELETE ON public.guests TO authenticated;

ALTER TABLE public.invitation_group_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY invitation_group_events_member_read ON public.invitation_group_events FOR SELECT TO authenticated USING(public.has_wedding_role(wedding_id));
GRANT SELECT ON public.invitation_group_events TO authenticated;
CREATE POLICY invitation_group_events_insert ON public.invitation_group_events FOR INSERT TO authenticated WITH CHECK(public.has_wedding_role(wedding_id,ARRAY['owner','admin','coordinator']::public.member_role[]));
CREATE POLICY invitation_group_events_update ON public.invitation_group_events FOR UPDATE TO authenticated USING(public.has_wedding_role(wedding_id,ARRAY['owner','admin','coordinator']::public.member_role[])) WITH CHECK(public.has_wedding_role(wedding_id,ARRAY['owner','admin','coordinator']::public.member_role[]));
CREATE POLICY invitation_group_events_delete ON public.invitation_group_events FOR DELETE TO authenticated USING(public.has_wedding_role(wedding_id,ARRAY['owner','admin','coordinator']::public.member_role[]));
GRANT INSERT,UPDATE,DELETE ON public.invitation_group_events TO authenticated;

ALTER TABLE public.rsvps ENABLE ROW LEVEL SECURITY;
CREATE POLICY rsvps_member_read ON public.rsvps FOR SELECT TO authenticated USING(public.has_wedding_role(wedding_id));
GRANT SELECT ON public.rsvps TO authenticated;

ALTER TABLE public.rsvp_attendees ENABLE ROW LEVEL SECURITY;
CREATE POLICY rsvp_attendees_member_read ON public.rsvp_attendees FOR SELECT TO authenticated USING(public.has_wedding_role(wedding_id));
GRANT SELECT ON public.rsvp_attendees TO authenticated;

ALTER TABLE public.event_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY event_attendance_member_read ON public.event_attendance FOR SELECT TO authenticated USING(public.has_wedding_role(wedding_id));
GRANT SELECT ON public.event_attendance TO authenticated;

ALTER TABLE public.wishlist_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY wishlist_categories_member_read ON public.wishlist_categories FOR SELECT TO authenticated USING(public.has_wedding_role(wedding_id));
GRANT SELECT ON public.wishlist_categories TO authenticated;
CREATE POLICY wishlist_categories_published_read ON public.wishlist_categories FOR SELECT TO anon,authenticated USING(public.is_published_wedding(wedding_id) AND (is_published));
GRANT SELECT ON public.wishlist_categories TO anon;
CREATE POLICY wishlist_categories_insert ON public.wishlist_categories FOR INSERT TO authenticated WITH CHECK(public.has_wedding_role(wedding_id,ARRAY['owner','admin','coordinator']::public.member_role[]));
CREATE POLICY wishlist_categories_update ON public.wishlist_categories FOR UPDATE TO authenticated USING(public.has_wedding_role(wedding_id,ARRAY['owner','admin','coordinator']::public.member_role[])) WITH CHECK(public.has_wedding_role(wedding_id,ARRAY['owner','admin','coordinator']::public.member_role[]));
CREATE POLICY wishlist_categories_delete ON public.wishlist_categories FOR DELETE TO authenticated USING(public.has_wedding_role(wedding_id,ARRAY['owner','admin','coordinator']::public.member_role[]));
GRANT INSERT,UPDATE,DELETE ON public.wishlist_categories TO authenticated;

ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY wishlist_items_member_read ON public.wishlist_items FOR SELECT TO authenticated USING(public.has_wedding_role(wedding_id));
GRANT SELECT ON public.wishlist_items TO authenticated;
CREATE POLICY wishlist_items_published_read ON public.wishlist_items FOR SELECT TO anon,authenticated USING(public.is_published_wedding(wedding_id) AND (is_published AND is_active AND (category_id IS NULL OR EXISTS(SELECT 1 FROM public.wishlist_categories c WHERE c.id=wishlist_items.category_id AND c.wedding_id=wishlist_items.wedding_id AND c.is_published))));
GRANT SELECT ON public.wishlist_items TO anon;
CREATE POLICY wishlist_items_insert ON public.wishlist_items FOR INSERT TO authenticated WITH CHECK(public.has_wedding_role(wedding_id,ARRAY['owner','admin','coordinator']::public.member_role[]));
CREATE POLICY wishlist_items_update ON public.wishlist_items FOR UPDATE TO authenticated USING(public.has_wedding_role(wedding_id,ARRAY['owner','admin','coordinator']::public.member_role[])) WITH CHECK(public.has_wedding_role(wedding_id,ARRAY['owner','admin','coordinator']::public.member_role[]));
CREATE POLICY wishlist_items_delete ON public.wishlist_items FOR DELETE TO authenticated USING(public.has_wedding_role(wedding_id,ARRAY['owner','admin','coordinator']::public.member_role[]));
GRANT INSERT,UPDATE,DELETE ON public.wishlist_items TO authenticated;

ALTER TABLE public.gift_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY gift_reservations_member_read ON public.gift_reservations FOR SELECT TO authenticated USING(public.has_wedding_role(wedding_id));
GRANT SELECT ON public.gift_reservations TO authenticated;

ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY contributions_member_read ON public.contributions FOR SELECT TO authenticated USING(public.has_wedding_role(wedding_id,ARRAY['owner','admin','viewer']::public.member_role[]));
GRANT SELECT ON public.contributions TO authenticated;

ALTER TABLE public.gallery_albums ENABLE ROW LEVEL SECURITY;
CREATE POLICY gallery_albums_member_read ON public.gallery_albums FOR SELECT TO authenticated USING(public.has_wedding_role(wedding_id));
GRANT SELECT ON public.gallery_albums TO authenticated;
CREATE POLICY gallery_albums_published_read ON public.gallery_albums FOR SELECT TO anon,authenticated USING(public.is_published_wedding(wedding_id) AND (is_published));
GRANT SELECT ON public.gallery_albums TO anon;
CREATE POLICY gallery_albums_insert ON public.gallery_albums FOR INSERT TO authenticated WITH CHECK(public.has_wedding_role(wedding_id,ARRAY['owner','admin','coordinator']::public.member_role[]));
CREATE POLICY gallery_albums_update ON public.gallery_albums FOR UPDATE TO authenticated USING(public.has_wedding_role(wedding_id,ARRAY['owner','admin','coordinator']::public.member_role[])) WITH CHECK(public.has_wedding_role(wedding_id,ARRAY['owner','admin','coordinator']::public.member_role[]));
CREATE POLICY gallery_albums_delete ON public.gallery_albums FOR DELETE TO authenticated USING(public.has_wedding_role(wedding_id,ARRAY['owner','admin','coordinator']::public.member_role[]));
GRANT INSERT,UPDATE,DELETE ON public.gallery_albums TO authenticated;

ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY gallery_images_member_read ON public.gallery_images FOR SELECT TO authenticated USING(public.has_wedding_role(wedding_id));
GRANT SELECT ON public.gallery_images TO authenticated;
CREATE POLICY gallery_images_published_read ON public.gallery_images FOR SELECT TO anon,authenticated USING(public.is_published_wedding(wedding_id) AND (is_published AND EXISTS(SELECT 1 FROM public.gallery_albums a WHERE a.id=gallery_images.album_id AND a.wedding_id=gallery_images.wedding_id AND a.is_published)));
GRANT SELECT ON public.gallery_images TO anon;
CREATE POLICY gallery_images_insert ON public.gallery_images FOR INSERT TO authenticated WITH CHECK(public.has_wedding_role(wedding_id,ARRAY['owner','admin','coordinator']::public.member_role[]));
CREATE POLICY gallery_images_update ON public.gallery_images FOR UPDATE TO authenticated USING(public.has_wedding_role(wedding_id,ARRAY['owner','admin','coordinator']::public.member_role[])) WITH CHECK(public.has_wedding_role(wedding_id,ARRAY['owner','admin','coordinator']::public.member_role[]));
CREATE POLICY gallery_images_delete ON public.gallery_images FOR DELETE TO authenticated USING(public.has_wedding_role(wedding_id,ARRAY['owner','admin','coordinator']::public.member_role[]));
GRANT INSERT,UPDATE,DELETE ON public.gallery_images TO authenticated;

ALTER TABLE public.guestbook_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY guestbook_messages_member_read ON public.guestbook_messages FOR SELECT TO authenticated USING(public.has_wedding_role(wedding_id));
GRANT SELECT ON public.guestbook_messages TO authenticated;
CREATE POLICY guestbook_messages_published_read ON public.guestbook_messages FOR SELECT TO anon,authenticated USING(public.is_published_wedding(wedding_id) AND (moderation_status='approved'));
GRANT SELECT ON public.guestbook_messages TO anon;
CREATE POLICY guestbook_messages_insert ON public.guestbook_messages FOR INSERT TO authenticated WITH CHECK(public.has_wedding_role(wedding_id,ARRAY['owner','admin','coordinator']::public.member_role[]));
CREATE POLICY guestbook_messages_update ON public.guestbook_messages FOR UPDATE TO authenticated USING(public.has_wedding_role(wedding_id,ARRAY['owner','admin','coordinator']::public.member_role[])) WITH CHECK(public.has_wedding_role(wedding_id,ARRAY['owner','admin','coordinator']::public.member_role[]));
CREATE POLICY guestbook_messages_delete ON public.guestbook_messages FOR DELETE TO authenticated USING(public.has_wedding_role(wedding_id,ARRAY['owner','admin','coordinator']::public.member_role[]));
GRANT INSERT,UPDATE,DELETE ON public.guestbook_messages TO authenticated;

ALTER TABLE public.seating_tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY seating_tables_member_read ON public.seating_tables FOR SELECT TO authenticated USING(public.has_wedding_role(wedding_id));
GRANT SELECT ON public.seating_tables TO authenticated;
CREATE POLICY seating_tables_insert ON public.seating_tables FOR INSERT TO authenticated WITH CHECK(public.has_wedding_role(wedding_id,ARRAY['owner','admin','coordinator']::public.member_role[]));
CREATE POLICY seating_tables_update ON public.seating_tables FOR UPDATE TO authenticated USING(public.has_wedding_role(wedding_id,ARRAY['owner','admin','coordinator']::public.member_role[])) WITH CHECK(public.has_wedding_role(wedding_id,ARRAY['owner','admin','coordinator']::public.member_role[]));
CREATE POLICY seating_tables_delete ON public.seating_tables FOR DELETE TO authenticated USING(public.has_wedding_role(wedding_id,ARRAY['owner','admin','coordinator']::public.member_role[]));
GRANT INSERT,UPDATE,DELETE ON public.seating_tables TO authenticated;

ALTER TABLE public.seat_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY seat_assignments_member_read ON public.seat_assignments FOR SELECT TO authenticated USING(public.has_wedding_role(wedding_id));
GRANT SELECT ON public.seat_assignments TO authenticated;

ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
CREATE POLICY check_ins_member_read ON public.check_ins FOR SELECT TO authenticated USING(public.has_wedding_role(wedding_id));
GRANT SELECT ON public.check_ins TO authenticated;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notifications_member_read ON public.notifications FOR SELECT TO authenticated USING(public.has_wedding_role(wedding_id));
GRANT SELECT ON public.notifications TO authenticated;

ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY payment_webhook_events_member_read ON public.payment_webhook_events FOR SELECT TO authenticated USING(public.has_wedding_role(wedding_id,ARRAY['owner','admin']::public.member_role[]));
GRANT SELECT ON public.payment_webhook_events TO authenticated;

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY media_assets_member_read ON public.media_assets FOR SELECT TO authenticated USING(public.has_wedding_role(wedding_id));
GRANT SELECT ON public.media_assets TO authenticated;
CREATE POLICY media_assets_published_read ON public.media_assets FOR SELECT TO anon,authenticated USING(public.is_published_wedding(wedding_id) AND (is_published));
GRANT SELECT ON public.media_assets TO anon;
CREATE POLICY media_assets_insert ON public.media_assets FOR INSERT TO authenticated WITH CHECK(public.has_wedding_role(wedding_id,ARRAY['owner','admin','coordinator']::public.member_role[]));
CREATE POLICY media_assets_update ON public.media_assets FOR UPDATE TO authenticated USING(public.has_wedding_role(wedding_id,ARRAY['owner','admin','coordinator']::public.member_role[])) WITH CHECK(public.has_wedding_role(wedding_id,ARRAY['owner','admin','coordinator']::public.member_role[]));
CREATE POLICY media_assets_delete ON public.media_assets FOR DELETE TO authenticated USING(public.has_wedding_role(wedding_id,ARRAY['owner','admin','coordinator']::public.member_role[]));
GRANT INSERT,UPDATE,DELETE ON public.media_assets TO authenticated;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_logs_member_read ON public.audit_logs FOR SELECT TO authenticated USING(public.has_wedding_role(wedding_id,ARRAY['owner','admin']::public.member_role[]));
GRANT SELECT ON public.audit_logs TO authenticated;

-- Trusted server workflows still pass their own authorization checks before using this role.
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
-- Ordinary users have no direct mutation grants/policies on transactional/financial tables.
