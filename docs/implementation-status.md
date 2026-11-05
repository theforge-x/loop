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
- First Supabase startup: registry timeouts/DNS failures prevented PostgreSQL and gateway image completion. Retry has downloaded Auth, REST, and gateway; PostgreSQL remains pending.
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

Public guestbook submission, RSVP writes, reservations, email delivery and administration editing remain in their assigned subsequent phases. No unavailable action is presented as a saved transaction.

## Phase 4 — Invitations/RSVP — ACCEPTANCE CHECKS PASS; live email/browser QA deferred

Implemented: membership-protected guest/group CRUD, search and guest pagination, authenticated CSV export, atomic CSV import RPC, secure link/QR generation, invitation delivery queue/status, personalized RSVP form, validated/rate-limited RSVP endpoint, persisted email outbox and Resend transport/retry handling. Migration 007 is applied and types regenerated.

`npm run test:invitations` passes all 6 workflow groups: quoted/formula-safe CSV, transactional import/rollback and role restrictions, tenant-protected HTTP export, valid/invalid/expired/over-limit RSVP requests, origin checks, saved responses despite email failure, atomic limits, invitation token-field/revocation restrictions, queue deduplication, and controlled Resend transport tests. Migrations 008–009 preserve delivery state on deduplicated jobs and protect token/delivery columns behind database routines. Lint, strict TypeScript, production build and database lint pass.

Live email delivery still requires `RESEND_API_KEY` and `RESEND_FROM_EMAIL`; neither is configured. Transport tests use controlled responses and do not claim actual provider delivery. Browser action/interaction QA remains deferred under the user’s instruction. See manual-resolution.md. No Phase 5 implementation has started.

## Sequential gates

| Phase | Status | Required acceptance evidence |
| --- | --- | --- |
| 1 Foundation | Complete; additional browser QA deferred | Running app, real Supabase connection, strict TS, layouts, documented setup |
| 2 Database | Complete | Migrations apply; tested RLS/tenant isolation/storage/gift concurrency/RSVP uniqueness; generated types |
| 3 Public website | Implemented; HTTP/data/SEO checks pass; browser QA deferred | All routes, Supabase content, mobile layouts, publication filtering, dynamic SEO |
| 4 Invitations/RSVP | Acceptance checks pass; live email/browser QA deferred | Hashed secure tokens, server allowances, group privacy, RSVP/CSV integration |
| 5 Registry/payments | Not started | Gift CRUD, concurrency, verified signatures/transactions, webhook idempotency |
| 6 Administration | Not started | Persisted CRUD, server and RLS roles, preview/publish, real analytics |
| 7 Advanced operations | Not started | Email retry logs, gallery permissions, moderation, secure unique check-in, seating capacity |
| 8 Production readiness | Not started | Critical suites, tenant isolation, production secrets, deployment and recovery documentation |
