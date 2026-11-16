# Implementation status

Source of truth: `wedding_web_app_implementation_specification.docx`, section 6. Current result: all eight phases have implementation and passing local acceptance evidence; real provider and production/device gates remain OPEN under the user's manual-intervention exception. Do not advance on implementation alone; each acceptance criterion needs recorded verification.

## Phase 1 — Foundation — COMPLETE

- [x] App Router, strict TypeScript, Tailwind, Shadcn-compatible controls, Lucide, Framer Motion.
- [x] Browser/server Supabase SSR clients and cookie-aware authentication utilities.
- [x] Public/admin layouts, design tokens, reusable controls, loading/error/not-found states.
- [x] Environment setup and migration workflow documented.
- [x] Supabase CLI configuration initialized.
- [x] Local Supabase connection verified: Auth settings and database REST endpoint both pass.
- [x] ESLint and strict TypeScript pass (`npm run check`).
- [x] Production build passes; running production server returns home 200 and unknown route 404.
- [x] Desktop/mobile foundation, responsive overflow, authentication and recovery browser checks pass.

All stated Phase 1 acceptance criteria now pass. The historical browser limitation was resolved during final QA. See [manual-resolution.md](manual-resolution.md) for evidence, reproduction, and recommendations.

## Verification history (initial setup; final results are in Phase 8)

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

## Phase 3 — Public website — LOCAL ACCEPTANCE CHECKS PASS

- [x] Wedding-slug homepage, story, events, RSVP entry, wishlist, gallery, FAQ, travel and guestbook routes render real Supabase records.
- [x] Token-validated personalized invitation route renders only the intended group.
- [x] Public rendering uses an anonymous client and explicit publication filtering, including when an administrator is signed in.
- [x] Canonical URLs, descriptions and page titles resolve dynamically from wedding content.
- [x] Approved private-bucket images are signed and optimized through Next.js Image.
- [x] Responsive navigation/layout styles, reduced-motion handling, FAQ disclosures and a keyboard/lightbox implementation exist.
- [x] `npm run check` passes; `npm run test:public` passes all 4 production HTTP integration groups (nine public routes plus invitation/admin/image checks).
- [x] Desktop/mobile navigation, responsive overflow, gallery keyboard controls and focus recovery pass browser checks.

Phase 3 originally left write workflows to their assigned later phases. Their implemented/verified status is recorded in the sections below; public guestbook submission and the complete CMS are implemented and tested in Phases 6–8.

## Phase 4 — Invitations/RSVP — LOCAL ACCEPTANCE CHECKS PASS; LIVE EMAIL OPEN

Implemented: membership-protected guest/group CRUD, search and guest pagination, authenticated CSV export, atomic CSV import RPC, secure link/QR generation, invitation delivery queue/status, personalized RSVP form, validated/rate-limited RSVP endpoint, persisted email outbox and Resend transport/retry handling. Migration 007 is applied and types regenerated.

`npm run test:invitations` passes all 6 workflow groups: quoted/formula-safe CSV, transactional import/rollback and role restrictions, tenant-protected HTTP export, valid/invalid/expired/over-limit RSVP requests, origin checks, saved responses despite email failure, atomic limits, invitation token-field/revocation restrictions, queue deduplication, and controlled Resend transport tests. Migrations 008–009 preserve delivery state on deduplicated jobs and protect token/delivery columns behind database routines. Lint, strict TypeScript, production build and database lint pass.

Live email delivery still requires `RESEND_API_KEY` and `RESEND_FROM_EMAIL`; neither is configured. Transport tests use controlled responses and do not claim actual provider delivery. Desktop/mobile RSVP editing, attendee limits, dietary persistence and saved-response reload pass. See manual-resolution.md. Phase 5 progress is recorded below.

## Phase 5 — Registry/payments — IMPLEMENTED; PROVIDER GATE OPEN

Implemented: gift/category CRUD and image selection, real quantity reporting, public atomic reservations, opaque private cancellation links, fulfilment/release controls, optional NGN contributions, server-side Paystack initialization, timestamped/legacy webhook validation, independent provider transaction verification, exact 64-bit transaction IDs, and verified-only receipts. Migration 010 is applied and database types regenerated.

Passing evidence: production build/lint/strict TypeScript; four payment logic/transport tests; nine workflow groups including real gift/category CRUD, eight simultaneous HTTP reservation attempts for one unit, cancellation and fulfilment, tenant/role checks, absent-configuration behavior and forged callback rejection; ten real database integration groups; four public HTTP groups; database lint.

**Not complete:** actual Paystack sandbox checkout/webhook verification cannot run because provider credentials are absent. Controlled provider responses are explicitly test fixtures, not proof of a live provider integration. `npm run verify:paystack` is prepared and refuses live keys. Desktop/mobile physical reservation and private cancellation workflows pass. The user authorized proceeding past checks that require manual intervention. The missing Paystack credentials are flagged in manual-resolution.md; provider verification remains open.

## Sequential gates

| Phase | Status | Required acceptance evidence |
| --- | --- | --- |
| 1 Foundation | Complete; browser checks pass | Running app, real Supabase connection, strict TS, layouts, documented setup |
| 2 Database | Complete | Migrations apply; tested RLS/tenant isolation/storage/gift concurrency/RSVP uniqueness; generated types |
| 3 Public website | Local acceptance checks pass, including browsers | All routes, Supabase content, mobile layouts, publication filtering, dynamic SEO |
| 4 Invitations/RSVP | Local acceptance checks pass; live email open | Hashed secure tokens, server allowances, group privacy, RSVP/CSV integration |
| 5 Registry/payments | Implemented; local checks pass; actual Paystack verification pending | Gift CRUD, concurrency, verified signatures/transactions, webhook idempotency |
| 6 Administration | Local acceptance checks pass | Persisted CRUD, server and RLS roles, preview/publish, real analytics |
| 7 Advanced operations | Local acceptance checks pass; live provider/camera checks flagged | Email retry logs, gallery permissions, moderation, secure unique check-in, seating capacity |
| 8 Production readiness | Local acceptance checks pass; external release gates open | Critical suites, tenant isolation, production secrets, deployment and recovery documentation |

## Committed milestones

- `b039805`: application/data/public-site foundation and initial Phase 4 checkpoint.
- `8da42fb`: verified Phase 4 workflows and invitation field/revocation safeguards.
- `b688966`: Phase 5 implementation and passing local checks; actual provider verification remains open.

## Phase 6 — Administration — LOCAL ACCEPTANCE CHECKS PASS (2026-11-09)

Implemented visual website/identity/theme forms, private preview using the public homepage component, separate tenant-protected content drafts, transactional publication, story/events/FAQ/travel/announcement/album/photo forms, role-protected team membership and final-owner protection, real guest/reservation/payment/activity metrics, payment filtering/pagination, operational RSVP review/editing, moderation, seating/check-in controls and CSV reports. Existing guest and registry modules are retained.

Evidence: `npm run check` passed lint, strict TypeScript and production build; `npm run db:lint` passed; `npm run test:administration` passed 4 groups covering every CMS content module, create/edit/publish/hide/delete persistence, role/tenant restrictions, private preview, transactional website publication and final-owner retention. Regression suites passed: database 10/10, public HTTP 4/4, invitations/registry 9/9. Desktop/mobile visual website editing, private draft preview and explicit website/event publication pass browser checks.

Migrations 011–012 applied locally. Supabase default anonymous grants were explicitly removed from the draft table. Publication does not expose drafts through public `SELECT *` queries. Media uploads, communication scheduling and secure QR lookup are the Phase 7 extensions to the administration shell.

## Phase 7 — Advanced operations — LOCAL ACCEPTANCE CHECKS PASS (2026-11-09)

Implemented authenticated multi-image uploads with byte/MIME/size checks, private media library and independent image/album/photo publication, safe reference-aware deletion, moderated/rate-limited/honeypot guestbook submission, invitation QR camera/manual lookup, server/RLS roles and token revocation/expiry/tenant checks, unique check-in, capacity-serialized seating and CSV reports. Communication supports announcement/event-reminder queues, responsive escaped email templates, atomic delivery leases, expired-lease recovery, exponential retries (8 attempts), delivery-event signatures/replay deduplication, bounce/complaint suppression and an authenticated scheduled worker with rate-limit cleanup.

Evidence: `npm run check` passed; `npm run test:email` 2/2; `npm run test:operations` 6/6; Phase 6 administration 4/4 and invitation/registry regression 9/9 passed. Database lint passed with an explicit local connection using sslmode=disable. Migrations 013–014 applied transactionally through local container psql and recorded in Supabase history after the CLI's implicit connection timed out; generated types match the actual schema.

Real Resend sending/delivery events need account credentials and a reachable verified webhook. Scheduled deployment needs CRON_SECRET and a scheduler. Physical mobile-camera QA needs a compatible HTTPS device. These remain manual gates, not claimed passes. Desktop/mobile moderation, navigation, lightbox keyboard controls and focus recovery pass during Phase 8. Historical intermittent host stalls are recorded in manual-resolution.md.

## Phase 8 — Production readiness — IMPLEMENTED; EXTERNAL GATES OPEN (2026-11-09)

Implemented automated CI with isolated Supabase and desktop/mobile browsers, component interaction tests, release/privacy/security integration checks, published-only sitemap/robots, dynamic social images and structured metadata, security headers, atomic CMS batch publication, notification retry/lease hardening, production configuration validation, Vercel scheduler configuration and deployment/backup/restore/rollback instructions. Dependency audit is part of final verification.

`npm run check` passes after final UI fixes. The complete non-browser suite passed 48 tests/groups: component 4, payments 4, email 2, database 10, public 4, invitation/registry 9, administration 4, operations 6 and release 5. Final invitation/registry 9/9, operations 6/6 and release 5/5 reruns pass. All 22 desktop/mobile scenarios pass across final focused/project reruns. Lint/build/type checks and database lint pass; npm audit reports zero vulnerabilities. Browser failures exposed gallery focus and error recovery issues, which were fixed, and canonical-origin/test-selector mismatches, which were corrected. The suite retains real assertions; no check was skipped or force-clicked. No production credential, deployment, actual provider receipt, physical camera or recovery success is claimed. See [production-runbook.md](production-runbook.md) and [manual-resolution.md](manual-resolution.md).

Additional committed milestones: `e8595d4` (Phase 6 administration), `1a907bb` (Phase 7 operations). Commits use the requested theForge <hello@theforge.ng> identity.

## Registration and wedding onboarding — 2026-11-09

Added public registration from the landing/sign-in pages, password confirmation and server-side validation, rate-limited Supabase Auth signup, immediate onboarding when confirmation is disabled, and an email confirmation callback supporting PKCE and token-hash links. Redirects are fixed to the configured application origin. Invalid/replayed links show recovery instructions. Authenticated `/admin/new` creates a private wedding through the existing transactional routine, assigns owner membership/settings and opens the visual website editor. Existing users can create additional weddings from `/admin`. Duplicate/reserved slugs are rejected; form values survive errors.

Verification: `npm run check` passes lint, strict TypeScript and production build; release security suite 5/5 passes. All four new desktop/mobile onboarding scenarios pass across the final isolated production-server run and desktop rerun, with real local Supabase Auth/database. They verify password mismatch recovery, signup, private defaults, owner membership/settings, workspace discovery, duplicate/reserved slug errors, token confirmation/replay rejection, fixed redirect destination and anonymous protection. Earlier runs exposed accessible-label/form-reset issues (fixed) and development-server/host timing failures; final tests use port 3106 and wait for server actions without bypassing assertions. Hosted confirmation email delivery still requires operator-managed Supabase Auth sender/template/redirect setup, documented in README. No new migration or account reset was needed.

## Codebase review and interface improvements — 2026-11-16

The admin interface now uses grouped desktop sidebar navigation, an active-page indicator, a collapsible mobile menu, publication status, a redesigned wedding chooser and a clearer overview with metrics, upcoming events and recent activity. The public landing page has a fuller introduction, feature descriptions and direct registration links. Wedding pages have a sticky navigation bar, a home link, an emphasized RSVP action, an improved hero with a designed fallback when no image is available, keyboard dismissal for the mobile menu, and consistent content widths and gutters across story, event, gallery, RSVP and other interior pages. Shared focus states and table styling are improved.

Issues resolved during this review:

- The overview displayed event times in UTC regardless of the wedding's configured timezone. Event and activity dates now use that timezone.
- Coordinators triggered an unnecessary payment-count query despite being unable to view payment reports. That query is now skipped for coordinators.
- Invitation clipboard failures were silently ignored. Copying now reports success or explains how to copy the selected link manually.
- A rejected QR lookup left the interface stuck in its pending state. Network errors now produce retry instructions and release the pending state.
- Draft previews restored the previous wedding date when the draft intentionally cleared it. Clearing the date now remains visible in the preview.
- Public pages and previews maintained different theme token sets, leaving card surfaces and button text inconsistent with custom colors. Both now use the same theme helper, including contrasting primary button text and matching surfaces.
- CI required `npm ci` after the npm lockfile had been removed. Scripts, current setup documentation and CI now use pnpm, with the package-manager version pinned. pnpm 11 ignores package.json overrides; the existing ESLint parser dependency override now lives in `pnpm-workspace.yaml`. Frozen-lockfile installation succeeds and `pnpm audit` reports zero known vulnerabilities.
- Browser tests could interact with homepage gallery previews before gallery navigation completed, or leave moderation before its server action completed. They now wait for the gallery URL, initial dialog focus and removal of approved messages from the pending moderation list. No forced clicks, skipped assertions or fixed sleeps were added.

New regression coverage exercises failed QR retries, clipboard denial, theme button contrast, gallery keyboard/focus behavior and responsive admin navigation. The existing database, public HTTP, invitation, administration, operations and release integration suites passed all 38 tests/groups against real local Supabase. Component, controlled payment and controlled email tests pass. Lint, strict TypeScript and the production build pass.

Remaining setup requirements are unchanged: real Paystack sandbox verification, Resend/Auth inbox delivery and signed delivery events, production scheduler/secrets/domain/hosting, physical HTTPS camera testing and backup/restore rehearsal. `pnpm verify:release` correctly rejects this local environment's missing production configuration. No provider delivery or production deployment is claimed. The existing invitation-group and RSVP-summary controls still have a 1,000-record retrieval ceiling; a large-directory search/pagination enhancement remains a separate follow-up. See the existing manual-resolution and production-runbook documents for operator steps.

Final browser verification: `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium PLAYWRIGHT_REUSE_SERVER=true pnpm test:e2e` passed all 28 desktop/mobile scenarios in one complete run. Together with 8 component tests, 4 payment tests, 2 email tests and 38 database/HTTP tests/groups, this review has 80 passing automated checks. Screenshots of the public landing page, wedding homepage and admin overview were captured on desktop and mobile under ignored `test-results/`; the desktop admin and desktop/mobile landing screenshots were visually inspected. Earlier browser failures are superseded by this complete passing run after the navigation/save synchronization fixes.

## Light and dark mode — 2026-11-16

Added an accessible sun/moon header control across the landing page, authentication screens, admin workspace and public wedding pages. The initial mode follows the device preference unless the visitor has saved a choice. Choices persist in local browser storage, synchronize between tabs and remain usable when storage is blocked. An early initialization script applies the preference before paint. Dark tokens cover surfaces, text, borders, native controls and promotional actions; public wedding pages and draft previews adapt their custom branding through the same scoped theme tokens.

Validation: lint, strict TypeScript and production build pass; all 14 component tests pass, including six preference/toggle regressions. All 32 desktop/mobile browser scenarios pass across the complete run and focused preference rerun. The focused rerun corrected an ambiguous workspace-link selector and waited for computed palette styles before comparison. Dark admin and wedding screenshots were captured; the dark desktop admin screenshot was visually inspected.
