-- Phase 2: all relation skeletons are created first so every composite FK can be validated.
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE TYPE public.member_role AS ENUM ('owner','admin','coordinator','viewer');
CREATE TYPE public.rsvp_status AS ENUM ('attending','declined');
CREATE TYPE public.reservation_status AS ENUM ('reserved','fulfilled','cancelled');
CREATE TYPE public.contribution_status AS ENUM ('pending','successful','failed');
CREATE TABLE public.profiles (
 id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 display_name text NOT NULL DEFAULT '', avatar_url text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.weddings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug) BETWEEN 3 AND 80),
 title text NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
 partner_one_name text NOT NULL, partner_two_name text NOT NULL,
 wedding_date timestamptz, timezone text NOT NULL DEFAULT 'Africa/Lagos',
 is_published boolean NOT NULL DEFAULT false,
 created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.wedding_members (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 wedding_id uuid NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
 profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, role public.member_role NOT NULL DEFAULT 'viewer', UNIQUE(wedding_id,profile_id),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(wedding_id,id)
);

CREATE TABLE public.site_settings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 wedding_id uuid NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
 content jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(content)='object'), theme jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(theme)='object'), is_published boolean NOT NULL DEFAULT false, UNIQUE(wedding_id,is_published),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(wedding_id,id)
);

CREATE TABLE public.story_sections (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 wedding_id uuid NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
 title text NOT NULL, content text, image_path text, section_type text NOT NULL DEFAULT 'story', sort_order integer NOT NULL DEFAULT 0, is_published boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(wedding_id,id)
);

CREATE TABLE public.events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 wedding_id uuid NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
 title text NOT NULL, description text, starts_at timestamptz NOT NULL, ends_at timestamptz, venue_name text, address text, map_url text, dress_code text, is_private boolean NOT NULL DEFAULT false, is_published boolean NOT NULL DEFAULT false, sort_order integer NOT NULL DEFAULT 0, CHECK(ends_at IS NULL OR ends_at>=starts_at),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(wedding_id,id)
);

CREATE TABLE public.faqs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 wedding_id uuid NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
 question text NOT NULL, answer text NOT NULL, sort_order integer NOT NULL DEFAULT 0, is_published boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(wedding_id,id)
);

CREATE TABLE public.announcements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 wedding_id uuid NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
 title text NOT NULL, content text NOT NULL, is_published boolean NOT NULL DEFAULT false, publish_at timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(wedding_id,id)
);

CREATE TABLE public.travel_information (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 wedding_id uuid NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
 title text NOT NULL, content text NOT NULL, information_type text NOT NULL DEFAULT 'travel', link_url text, sort_order integer NOT NULL DEFAULT 0, is_published boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(wedding_id,id)
);

CREATE TABLE public.invitation_groups (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 wedding_id uuid NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
 name text NOT NULL, contact_email text, guest_allowance integer NOT NULL DEFAULT 1 CHECK(guest_allowance BETWEEN 1 AND 1000), token_hash text UNIQUE CHECK(token_hash IS NULL OR token_hash ~ '^[0-9a-f]{64}$'), token_expires_at timestamptz, token_revoked_at timestamptz, delivery_status text NOT NULL DEFAULT 'not_sent' CHECK(delivery_status IN ('not_sent','queued','sent','failed')), UNIQUE(wedding_id,id,guest_allowance),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(wedding_id,id)
);

CREATE TABLE public.guests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 wedding_id uuid NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
 invitation_group_id uuid NOT NULL, name text NOT NULL CHECK(length(name) BETWEEN 1 AND 200), email text, phone text, is_primary boolean NOT NULL DEFAULT false, UNIQUE(wedding_id,invitation_group_id,id), FOREIGN KEY(wedding_id,invitation_group_id) REFERENCES public.invitation_groups(wedding_id,id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(wedding_id,id)
);

CREATE TABLE public.invitation_group_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 wedding_id uuid NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
 invitation_group_id uuid NOT NULL, event_id uuid NOT NULL, UNIQUE(wedding_id,invitation_group_id,event_id), FOREIGN KEY(wedding_id,invitation_group_id) REFERENCES public.invitation_groups(wedding_id,id) ON DELETE CASCADE, FOREIGN KEY(wedding_id,event_id) REFERENCES public.events(wedding_id,id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(wedding_id,id)
);

CREATE TABLE public.rsvps (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 wedding_id uuid NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
 invitation_group_id uuid NOT NULL, status public.rsvp_status NOT NULL, dietary_requirements text, accessibility_requirements text, message text, responded_at timestamptz NOT NULL DEFAULT now(), UNIQUE(wedding_id,invitation_group_id), UNIQUE(wedding_id,invitation_group_id,id), FOREIGN KEY(wedding_id,invitation_group_id) REFERENCES public.invitation_groups(wedding_id,id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(wedding_id,id)
);

CREATE TABLE public.rsvp_attendees (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 wedding_id uuid NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
 rsvp_id uuid NOT NULL, invitation_group_id uuid NOT NULL, guest_id uuid, guest_name text NOT NULL CHECK(length(btrim(guest_name)) BETWEEN 1 AND 200), is_primary boolean NOT NULL DEFAULT false, attendee_type text NOT NULL DEFAULT 'guest' CHECK(attendee_type IN ('guest','plus_one','child')), UNIQUE(wedding_id,rsvp_id,id), FOREIGN KEY(wedding_id,invitation_group_id,rsvp_id) REFERENCES public.rsvps(wedding_id,invitation_group_id,id) ON DELETE CASCADE, FOREIGN KEY(wedding_id,invitation_group_id,guest_id) REFERENCES public.guests(wedding_id,invitation_group_id,id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(wedding_id,id)
);

CREATE TABLE public.event_attendance (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 wedding_id uuid NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
 event_id uuid NOT NULL, rsvp_id uuid NOT NULL, attendee_id uuid NOT NULL, UNIQUE(wedding_id,event_id,attendee_id), UNIQUE(wedding_id,event_id,attendee_id,id), FOREIGN KEY(wedding_id,event_id) REFERENCES public.events(wedding_id,id) ON DELETE RESTRICT, FOREIGN KEY(wedding_id,rsvp_id,attendee_id) REFERENCES public.rsvp_attendees(wedding_id,rsvp_id,id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(wedding_id,id)
);

CREATE TABLE public.wishlist_categories (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 wedding_id uuid NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
 title text NOT NULL, description text, sort_order integer NOT NULL DEFAULT 0, is_published boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(wedding_id,id)
);

CREATE TABLE public.wishlist_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 wedding_id uuid NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
 category_id uuid, title text NOT NULL, description text, image_path text, price_minor bigint CHECK(price_minor>=0), currency text NOT NULL DEFAULT 'NGN' CHECK(currency ~ '^[A-Z]{3}$'), quantity_required integer NOT NULL DEFAULT 1 CHECK(quantity_required BETWEEN 1 AND 100000), external_url text, is_active boolean NOT NULL DEFAULT true, is_published boolean NOT NULL DEFAULT false, sort_order integer NOT NULL DEFAULT 0, FOREIGN KEY(wedding_id,category_id) REFERENCES public.wishlist_categories(wedding_id,id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(wedding_id,id)
);

CREATE TABLE public.gift_reservations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 wedding_id uuid NOT NULL REFERENCES public.weddings(id) ON DELETE RESTRICT,
 wishlist_item_id uuid NOT NULL, quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 100000), status public.reservation_status NOT NULL DEFAULT 'reserved', name text, email text, message text, reveal_identity boolean NOT NULL DEFAULT false, cancellation_token_hash text NOT NULL UNIQUE CHECK(cancellation_token_hash ~ '^[0-9a-f]{64}$'), expires_at timestamptz, fulfilled_at timestamptz, FOREIGN KEY(wedding_id,wishlist_item_id) REFERENCES public.wishlist_items(wedding_id,id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(wedding_id,id)
);

CREATE TABLE public.contributions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 wedding_id uuid NOT NULL REFERENCES public.weddings(id) ON DELETE RESTRICT,
 wishlist_item_id uuid, reference text NOT NULL UNIQUE CHECK(length(reference) BETWEEN 8 AND 200), amount_minor bigint NOT NULL CHECK(amount_minor>0), currency text NOT NULL DEFAULT 'NGN' CHECK(currency ~ '^[A-Z]{3}$'), status public.contribution_status NOT NULL DEFAULT 'pending', contributor_name text, email text, message text, provider text NOT NULL DEFAULT 'paystack' CHECK(provider='paystack'), provider_transaction_id text, verified_at timestamptz, UNIQUE(provider,provider_transaction_id), UNIQUE(wedding_id,id,reference), FOREIGN KEY(wedding_id,wishlist_item_id) REFERENCES public.wishlist_items(wedding_id,id) ON DELETE RESTRICT, CHECK((status='successful')=(verified_at IS NOT NULL)),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(wedding_id,id)
);

CREATE TABLE public.gallery_albums (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 wedding_id uuid NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
 title text NOT NULL, description text, sort_order integer NOT NULL DEFAULT 0, is_published boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(wedding_id,id)
);

CREATE TABLE public.gallery_images (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 wedding_id uuid NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
 album_id uuid NOT NULL, image_path text NOT NULL, alt_text text NOT NULL, caption text, sort_order integer NOT NULL DEFAULT 0, is_published boolean NOT NULL DEFAULT false, FOREIGN KEY(wedding_id,album_id) REFERENCES public.gallery_albums(wedding_id,id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(wedding_id,id)
);

CREATE TABLE public.guestbook_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 wedding_id uuid NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
 name text NOT NULL CHECK(length(name) BETWEEN 1 AND 200), message text NOT NULL CHECK(length(message) BETWEEN 1 AND 4000), moderation_status text NOT NULL DEFAULT 'pending' CHECK(moderation_status IN ('pending','approved','rejected')), moderated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL, moderated_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(wedding_id,id)
);

CREATE TABLE public.seating_tables (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 wedding_id uuid NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
 name text NOT NULL, capacity integer NOT NULL CHECK(capacity BETWEEN 1 AND 1000), UNIQUE(wedding_id,name),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(wedding_id,id)
);

CREATE TABLE public.seat_assignments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 wedding_id uuid NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
 seating_table_id uuid NOT NULL, attendee_id uuid NOT NULL, UNIQUE(wedding_id,attendee_id), FOREIGN KEY(wedding_id,seating_table_id) REFERENCES public.seating_tables(wedding_id,id) ON DELETE RESTRICT, FOREIGN KEY(wedding_id,attendee_id) REFERENCES public.rsvp_attendees(wedding_id,id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(wedding_id,id)
);

CREATE TABLE public.check_ins (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 wedding_id uuid NOT NULL REFERENCES public.weddings(id) ON DELETE RESTRICT,
 event_id uuid NOT NULL, attendee_id uuid NOT NULL, coordinator_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL, checked_in_at timestamptz NOT NULL DEFAULT now(), UNIQUE(wedding_id,event_id,attendee_id), FOREIGN KEY(wedding_id,event_id,attendee_id) REFERENCES public.event_attendance(wedding_id,event_id,attendee_id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(wedding_id,id)
);

CREATE TABLE public.notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 wedding_id uuid NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
 notification_type text NOT NULL, recipient_email text NOT NULL, payload jsonb NOT NULL DEFAULT '{}'::jsonb, status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','sent','failed','suppressed')), attempts integer NOT NULL DEFAULT 0 CHECK(attempts>=0), next_attempt_at timestamptz NOT NULL DEFAULT now(), provider_message_id text, last_error text, sent_at timestamptz, deduplication_key text, UNIQUE(wedding_id,deduplication_key),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(wedding_id,id)
);

CREATE TABLE public.payment_webhook_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 wedding_id uuid NOT NULL REFERENCES public.weddings(id) ON DELETE RESTRICT,
 provider text NOT NULL CHECK(provider='paystack'), provider_event_id text NOT NULL, payment_reference text NOT NULL, contribution_id uuid NOT NULL, processing_status text NOT NULL DEFAULT 'processed' CHECK(processing_status IN ('processed','ignored')), processed_at timestamptz NOT NULL DEFAULT now(), UNIQUE(provider,provider_event_id), FOREIGN KEY(wedding_id,contribution_id,payment_reference) REFERENCES public.contributions(wedding_id,id,reference) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(wedding_id,id)
);

CREATE TABLE public.media_assets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 wedding_id uuid NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
 bucket_id text NOT NULL DEFAULT 'wedding-media' CHECK(bucket_id='wedding-media'), object_path text NOT NULL UNIQUE, mime_type text NOT NULL CHECK(mime_type IN ('image/jpeg','image/png','image/webp','image/avif')), size_bytes bigint NOT NULL CHECK(size_bytes BETWEEN 1 AND 10485760), is_published boolean NOT NULL DEFAULT false, CHECK(object_path LIKE wedding_id::text || '/%' AND object_path !~ '(^|/)\.\.(/|$)'),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(wedding_id,id)
);

CREATE TABLE public.audit_logs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 wedding_id uuid NOT NULL REFERENCES public.weddings(id) ON DELETE RESTRICT,
 actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
 action text NOT NULL, entity_type text NOT NULL, entity_id uuid,
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(wedding_id,id)
);
