# Database foundation

The schema is multi-tenant: weddings are tenant roots, profiles are shared Auth identities, and every owned relation carries `wedding_id`. Composite foreign keys prevent cross-wedding associations, including guests/groups, RSVP attendees, event attendance, gifts/categories, gallery albums, seating, check-in, and contribution/webhook references.

## Migration ordering

001 creates all relation skeletons, including extended tables, so forward composite foreign keys can be validated immediately. 002 defines explicit RLS, public publication filtering, and role grants. 003 adds restricted transactional routines. 004 adds a private media bucket and object policies. 005 adds query/uniqueness indexes. 006 wires profile creation, immutable tenant identifiers, capacity/allowance guards, owner retention, and audit history. This deliberately adapts the document’s illustrative 006 table creation to avoid unresolved forward relationships.

Migration files are tracked sequentially as 001–015. Do not edit migrations after production application; future changes require new migrations. During local development, reset only deliberately, because it destroys local Auth and application records.

## Authorization

Owner/admin manage branding; owner/admin/coordinator manage guests and operational content; viewer reads tenant records. Coordinators cannot access contribution reports. Viewers may read contribution reports. Only owners grant or modify owner/admin memberships; admins manage coordinator/viewer memberships. Removing the final owner is rejected. Identity verification is separate from membership authorization.

Public table reads require a published wedding and the record’s publication/moderation state. Private events remain hidden. Published gallery images also require a published parent album, and categorized gifts require a published category. Draft and published site settings occupy separate rows, preventing draft JSON from appearing through a public SELECT.

Guest, invitation, attendee, reservation-identity, contribution, notification, seating, and check-in records are private. Ordinary roles have no direct transactional/financial mutation privileges. Audit history is append-only, including through the service API. Historical financial/audit/check-in relationships intentionally restrict destructive deletion; future account/wedding deletion needs an explicit retention workflow.

## Trusted routines

- Authenticated operator routines check wedding membership inside the database: invitation issuance, administrative RSVP, gift fulfilment/release, seating assignment/reassignment/removal, check-in.
- Invitation lookup/submission, guest gift reservation/cancellation, and verified-payment application are executable only by the trusted service role. Future server routes must validate/rate-limit inputs and keep that credential server-only. Public callers cannot bypass those routes through direct RPC.
- Invitation issuance returns 256-bit random tokens once and stores SHA-256 hashes only. Expired/revoked/invalid tokens produce a generic rejection.
- RSVP locks the invitation group, checks allowance and event eligibility, and updates the unique group response plus attendees/attendance in one transaction. Checked-in/seated attendee history prevents destructive response replacement through RESTRICT foreign keys.
- Gift reservation locks the item before summing active reservations. Database triggers also reject direct over-reservation and quantity reductions below committed units. Expiry does not silently release capacity; a trusted operator must cancel an abandoned reservation explicitly.
- Seating serializes capacity changes within the wedding. Check-in is unique per event/attendee and requires event eligibility.
- `apply_verified_payment` validates amount, currency, reference and provider transaction uniqueness, and records a unique provider event transactionally. It does **not** perform Paystack HTTP verification. Phase 5 must verify signatures and independently verify provider transactions before calling it. A successful DB test is not evidence of a completed payment integration.
- `gift_availability` exposes aggregate quantities for published active items without contributor identity.

## Media

`wedding-media` is private, limits files to 10 MiB, and accepts JPEG/PNG/WebP/AVIF. Paths begin with the wedding UUID. Members with operational roles upload/manage only their tenant prefix. Anonymous reads require a published `media_assets` record and published wedding. Keep the bucket private; making it public would bypass publication RLS. Public pages should sign approved assets after publication checks. Deleting an object and removing its metadata must be coordinated in the media workflow.

## Evidence and limits

Ten real local integration tests passed without skips: schema RLS/grants, public filtering, tenant/role checks, hashed token validity, transactional/concurrent RSVP, concurrent gifts, financial replay, seating/check-in, real Storage permissions/MIME, and immutable audit history. Database lint passed and CLI-generated TypeScript definitions are used by the app. See `tests/database/platform.test.mjs`.

`npm run db:seed` creates two local wedding fixtures and six Auth accounts covering roles and an outsider. Generated credentials are private local files. Integration fixtures remain in the local database until reset; this preserves append-only history rather than bypassing invariants to erase tests. There is no automatic production seed.

## Administration and delivery migrations

007–010 add invitation delivery safeguards and registry/payment workflows. 011–012 isolate CMS drafts, restrict publication and protect final-owner membership. 013–014 add email event/suppression tables, leased notification claims, operator communication/check-in lookup and limiter cleanup. 015 protects draft identity, adds atomic batch publication, recovers older processing jobs and validates communication groups. Public roles cannot read drafts, delivery events or suppression records. Service-only routines retain explicit grants and safe search paths.

All fifteen versions are applied locally and generated database types reflect that schema. The CLI implicit connection can time out on this host; explicit local database lint with sslmode=disable works. Migrations 013–015 were applied transactionally through container psql and recorded in the Supabase migration history without resetting data.
