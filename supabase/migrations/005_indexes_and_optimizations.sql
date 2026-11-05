CREATE INDEX memberships_by_profile ON public.wedding_members(profile_id,wedding_id);
CREATE INDEX guests_by_group ON public.guests(wedding_id,invitation_group_id);
CREATE INDEX guests_name_search ON public.guests(wedding_id,lower(name));
CREATE UNIQUE INDEX one_primary_guest_per_group ON public.guests(wedding_id,invitation_group_id) WHERE is_primary;
CREATE UNIQUE INDEX one_primary_rsvp_attendee ON public.rsvp_attendees(wedding_id,rsvp_id) WHERE is_primary;
CREATE UNIQUE INDEX unique_named_guest_per_rsvp ON public.rsvp_attendees(wedding_id,rsvp_id,guest_id) WHERE guest_id IS NOT NULL;
CREATE INDEX attendees_by_group ON public.rsvp_attendees(wedding_id,invitation_group_id);
CREATE INDEX events_by_date ON public.events(wedding_id,starts_at) WHERE is_published;
CREATE INDEX active_reservations ON public.gift_reservations(wedding_id,wishlist_item_id) INCLUDE(quantity) WHERE status IN ('reserved','fulfilled');
CREATE INDEX reservation_expiry ON public.gift_reservations(expires_at) WHERE status='reserved';
CREATE INDEX contributions_reporting ON public.contributions(wedding_id,status,created_at DESC);
CREATE INDEX gallery_image_order ON public.gallery_images(wedding_id,album_id,sort_order);
CREATE INDEX story_section_order ON public.story_sections(wedding_id,sort_order) WHERE is_published;
CREATE INDEX guestbook_moderation ON public.guestbook_messages(wedding_id,moderation_status,created_at DESC);
CREATE INDEX seating_capacity_count ON public.seat_assignments(wedding_id,seating_table_id);
CREATE INDEX check_in_reporting ON public.check_ins(wedding_id,event_id,checked_in_at);
CREATE INDEX notification_retry_queue ON public.notifications(next_attempt_at) WHERE status IN ('pending','failed');
CREATE INDEX audit_tenant_history ON public.audit_logs(wedding_id,created_at DESC);
-- Composite UNIQUE(wedding_id,id) indexes already support tenant-scoped lookups on every owned table.
