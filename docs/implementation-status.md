# Implementation status

Source of truth: `wedding_web_app_implementation_specification.docx`, section 6. Do not advance on implementation alone; each acceptance criterion needs recorded verification.

## Phase 1 — Foundation — COMPLETE; browser QA deferred by user

- [x] App Router, strict TypeScript, Tailwind, Shadcn-compatible controls, Lucide, Framer Motion.
- [x] Browser/server Supabase SSR clients and cookie-aware authentication utilities.
- [x] Public/admin layouts, design tokens, reusable controls, loading/error/not-found states.
- [x] Environment setup and migration workflow documented.
- [x] Supabase CLI configuration initialized.
- [x] Local Supabase connection verified: Auth settings and database REST endpoint both pass.
- [x] ESLint and strict TypeScript pass (`npm run check`).
- [x] Production build passes; running production server returns home 200 and unknown route 404.
- [ ] Desktop/mobile browser checks pass — deferred by user; see manual-resolution.md.

All stated Phase 1 acceptance criteria now pass. The additional browser QA remains deferred under the user’s explicit instruction. See [manual-resolution.md](manual-resolution.md) for evidence, reproduction, and recommendations.

## Verification evidence so far

- `npm run check`: passed lint, strict TypeScript, and production build (Next.js 16.4.5).
- Production HTTP smoke checks: `/` returns 200 with expected content; unknown page returns 404 with recovery link.
- First public browser run: could not launch the system Chromium because of local display/GPU configuration; no page assertions executed. Installing Playwright headless shell before retrying.
- Initial Supabase startup hit registry timeouts/DNS failures; retry completed and all local services, connectivity checks, and Storage integration tests now pass.
- No hosted project credentials were provided, and no fake connection is used.

## Phase 2 — Database — COMPLETE

- [x] Migrations 001–006 apply to real local Supabase PostgreSQL.
- [x] Explicit RLS policies exist on all 29 application tables; privileged routines have safe search paths and grants.
- [x] Role permissions, tenant foreign keys, publication filtering, and private guest data are tested.
- [x] RSVP allowance/uniqueness and concurrent gift reservation protection are tested.
- [x] Private Storage upload/download/publication/role/MIME policies are tested against the running Storage API.
- [x] Payment replay/amount/currency protection, check-in uniqueness, seating capacity, and append-only audit are tested.
- [x] Database types generated and connected to browser/server/proxy clients.
- [x] Auth-backed local development seed ran successfully.
- [x] Database lint and application lint/typecheck/production build pass.

Evidence: `npm run test:database` — 10 passed, 0 failed, 0 skipped; `npm run db:lint` — no schema errors; `npm run db:types`; `npm run db:seed`; `npm run check`.

These tests validate database behavior. Paystack HTTP signature/provider verification, Resend delivery, invitation delivery, and production deployment remain in their specified later phases.

## Phase 3 — Public website — IMPLEMENTED; browser QA deferred by user

- [x] Wedding-slug homepage, story, events, RSVP entry, wishlist, gallery, FAQ, travel and guestbook routes render real Supabase records.
- [x] Token-validated personalized invitation route renders only the intended group.
- [x] Public rendering uses an anonymous client and explicit publication filtering, including when an administrator is signed in.
- [x] Canonical URLs, descriptions and page titles resolve dynamically from wedding content.
- [x] Approved private-bucket images are signed and optimized through Next.js Image.
- [x] Responsive navigation/layout styles, reduced-motion handling, FAQ disclosures and a keyboard/lightbox implementation exist.
- [x] `npm run check` passes; `npm run test:public` passes all 4 production HTTP integration groups (nine public routes plus invitation/admin/image checks).
- [ ] Browser/mobile interaction verification remains deferred under the user’s instruction. It is not claimed as passing.

Phase 3 originally left write workflows to their assigned later phases. Their implemented/verified status is recorded in the sections below; public guestbook submission and the complete CMS still await their phases.

## Phase 4 — Invitations/RSVP — ACCEPTANCE CHECKS PASS; live email/browser QA deferred

Implemented: membership-protected guest/group CRUD, search and guest pagination, authenticated CSV export, atomic CSV import RPC, secure link/QR generation, invitation delivery queue/status, personalized RSVP form, validated/rate-limited RSVP endpoint, persisted email outbox and Resend transport/retry handling. Migration 007 is applied and types regenerated.

`npm run test:invitations` passes all 6 workflow groups: quoted/formula-safe CSV, transactional import/rollback and role restrictions, tenant-protected HTTP export, valid/invalid/expired/over-limit RSVP requests, origin checks, saved responses despite email failure, atomic limits, invitation token-field/revocation restrictions, queue deduplication, and controlled Resend transport tests. Migrations 008–009 preserve delivery state on deduplicated jobs and protect token/delivery columns behind database routines. Lint, strict TypeScript, production build and database lint pass.

Live email delivery still requires `RESEND_API_KEY` and `RESEND_FROM_EMAIL`; neither is configured. Transport tests use controlled responses and do not claim actual provider delivery. Browser action/interaction QA remains deferred under the user’s instruction. See manual-resolution.md. Phase 5 progress is recorded below.

## Phase 5 — Registry/payments — IMPLEMENTED; PROVIDER GATE OPEN

Implemented: gift/category CRUD and image selection, real quantity reporting, public atomic reservations, opaque private cancellation links, fulfilment/release controls, optional NGN contributions, server-side Paystack initialization, timestamped/legacy webhook validation, independent provider transaction verification, exact 64-bit transaction IDs, and verified-only receipts. Migration 010 is applied and database types regenerated.

Passing evidence: production build/lint/strict TypeScript; four payment logic/transport tests; nine workflow groups including real gift/category CRUD, eight simultaneous HTTP reservation attempts for one unit, cancellation and fulfilment, tenant/role checks, absent-configuration behavior and forged callback rejection; ten real database integration groups; four public HTTP groups; database lint.

**Not complete:** actual Paystack sandbox checkout/webhook verification cannot run because provider credentials are absent. Controlled provider responses are explicitly test fixtures, not proof of a live provider integration. `npm run verify:paystack` is prepared and refuses live keys. Browser QA remains deferred by the user. The user authorized proceeding past checks that require manual intervention. The missing Paystack credentials are flagged in manual-resolution.md; provider verification remains open.

## Sequential gates

| Phase | Status | Required acceptance evidence |
| --- | --- | --- |
| 1 Foundation | Complete; additional browser QA deferred | Running app, real Supabase connection, strict TS, layouts, documented setup |
| 2 Database | Complete | Migrations apply; tested RLS/tenant isolation/storage/gift concurrency/RSVP uniqueness; generated types |
| 3 Public website | Implemented; HTTP/data/SEO checks pass; browser QA deferred | All routes, Supabase content, mobile layouts, publication filtering, dynamic SEO |
| 4 Invitations/RSVP | Acceptance checks pass; live email/browser QA deferred | Hashed secure tokens, server allowances, group privacy, RSVP/CSV integration |
| 5 Registry/payments | Implemented; local checks pass; actual Paystack verification pending | Gift CRUD, concurrency, verified signatures/transactions, webhook idempotency |
| 6 Administration | Local acceptance checks pass | Persisted CRUD, server and RLS roles, preview/publish, real analytics |
| 7 Advanced operations | Local acceptance checks pass; live provider/camera checks flagged | Email retry logs, gallery permissions, moderation, secure unique check-in, seating capacity |
| 8 Production readiness | Not started | Critical suites, tenant isolation, production secrets, deployment and recovery documentation |

## Committed milestones

- `b039805`: application/data/public-site foundation and initial Phase 4 checkpoint.
- `8da42fb`: verified Phase 4 workflows and invitation field/revocation safeguards.
- `b688966`: Phase 5 implementation and passing local checks; actual provider verification remains open.

## Phase 6 — Administration — LOCAL ACCEPTANCE CHECKS PASS (2026-11-09)

Implemented visual website/identity/theme forms, private preview using the public homepage component, separate tenant-protected content drafts, transactional publication, story/events/FAQ/travel/announcement/album/photo forms, role-protected team membership and final-owner protection, real guest/reservation/payment/activity metrics, payment filtering/pagination, operational RSVP review/editing, moderation, seating/check-in controls and CSV reports. Existing guest and registry modules are retained.

Evidence: `npm run check` passed lint, strict TypeScript and production build; `npm run db:lint` passed; `npm run test:administration` passed 4 groups covering every CMS content module, create/edit/publish/hide/delete persistence, role/tenant restrictions, private preview, transactional website publication and final-owner retention. Regression suites passed: database 10/10, public HTTP 4/4, invitations/registry 9/9. A focused desktop browser check passed; a full desktop/mobile rerun is underway. Browser interaction coverage for the new forms is added during final QA.

Migrations 011–012 applied locally. Supabase default anonymous grants were explicitly removed from the draft table. Publication does not expose drafts through public `SELECT *` queries. Media uploads, communication scheduling and secure QR lookup are the Phase 7 extensions to the administration shell.

## Phase 7 — Advanced operations — LOCAL ACCEPTANCE CHECKS PASS (2026-11-09)

Implemented authenticated multi-image uploads with byte/MIME/size checks, private media library and independent image/album/photo publication, safe reference-aware deletion, moderated/rate-limited/honeypot guestbook submission, invitation QR camera/manual lookup, server/RLS roles and token revocation/expiry/tenant checks, unique check-in, capacity-serialized seating and CSV reports. Communication supports announcement/event-reminder queues, responsive escaped email templates, atomic delivery leases, expired-lease recovery, exponential retries (8 attempts), delivery-event signatures/replay deduplication, bounce/complaint suppression and an authenticated scheduled worker with rate-limit cleanup.

Evidence: `npm run check` passed; `npm run test:email` 2/2; `npm run test:operations` 6/6; Phase 6 administration 4/4 and invitation/registry regression 9/9 passed. Database lint passed with an explicit local connection using sslmode=disable. Migrations 013–014 applied transactionally through local container psql and recorded in Supabase history after the CLI's implicit connection timed out; generated types match the actual schema.

Real Resend sending/delivery events need account credentials and a reachable verified webhook. Scheduled deployment needs CRON_SECRET and a scheduler. Physical mobile-camera QA needs a compatible HTTPS device. These remain manual gates, not claimed passes. Browser automation launches, but intermittent screenshot/click timeouts on this host still require investigation during Phase 8.
