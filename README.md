# Loop

Wedding website and management platform, built sequentially from [the specification](docs/wedding_web_app_implementation_specification.docx).

## Current scope

Phases 1–7 are implemented with real Supabase-backed public pages, invitations/RSVP, registry/payments, a visual administration CMS, draft preview/publication, media, moderation, seating, QR check-in and communication queues. Phase 8 adds security/SEO checks, component and browser tests, CI and deployment/recovery tooling. Actual Paystack sandbox verification, live Resend delivery, production configuration/deployment and physical-camera QA require manual setup and remain flagged. See [implementation status](docs/implementation-status.md), [manual checks](docs/manual-resolution.md) and the [production runbook](docs/production-runbook.md).

## Requirements

- Node.js 22.12+ (Node 24 LTS recommended), npm, and Docker for local Supabase.
- A local Supabase stack or your own development Supabase project.

## Run locally

1. Run `npm ci`.
2. Start Docker, then run `npm run supabase:start` (first run downloads containers).
3. Copy `.env.example` to `.env.local`. From `npm run supabase:status`, set `NEXT_PUBLIC_SUPABASE_URL` to the API URL and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the local anon key. Keep these values local. Alternatively use a development Supabase project's URL and anon key.
4. Run `npm run verify:connection`. Both Auth settings and the database REST endpoint must pass.
5. Run `npm run dev` and open http://localhost:3000.

Apply the database using `npx --no-install supabase migration up --local`, then run `npm run db:seed` for local-only development fixtures. That command uses real Supabase Auth accounts and stores generated credentials in ignored `.local-dev-accounts.json` (mode 0600). It refuses non-local API hosts. Fixtures are never loaded by the production application. Authenticated members can open the overview, website/theme editor, content modules, guests, registry, media, communication, moderation, seating/check-in, payments and team controls. There is no public registration UI.

## Environment

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Application origin; localhost during development |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public project anon key; access is constrained by RLS |
| `NEXT_PUBLIC_DEFAULT_TIMEZONE` | Default timezone, Africa/Lagos |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only privileged key; later trusted workflows |
| `RESEND_API_KEY` | Server-only Resend sending key |
| `RESEND_FROM_EMAIL` | Verified sender address/domain |
| `RESEND_WEBHOOK_SECRET` | Server-only Svix signing secret for verified delivery events |
| `CRON_SECRET` | Random 32+ character server-only worker authentication secret |
| `RATE_LIMIT_SECRET` | Optional server-only HMAC key; defaults to the service key when blank |
| `TRUST_PROXY_HEADERS` | Default false; enable only behind a proxy that overwrites forwarding headers |
| `PAYSTACK_SECRET_KEY` | Server-only Paystack API credential |
| `PAYSTACK_WEBHOOK_SECRET` | Current timestamped webhook signing secret |
| `PAYSTACK_WEBHOOK_PREVIOUS_SECRET` | Optional signing-secret rotation overlap |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Browser payment identifier, Phase 5 |

Never commit `.env.local`, paste secrets into reports, or prefix private credentials with `NEXT_PUBLIC_`. Public rendering uses an anonymous client; trusted RSVP, registry, payment, guestbook and email workflows also require the server-only service-role key. It validates configuration when a Supabase client is requested, so static pages can build without credentials. Authentication routes require a working connection. Provider credentials are required for actual provider operations; missing configuration is recorded as failure, never fabricated success.

## Checks

- `npm run lint`: ESLint with zero warnings allowed.
- `npm run typecheck`: strict TypeScript.
- `npm run build`: production compilation and route generation.
- `npm run test:e2e`: production-server browser checks on desktop and mobile. Build first and configure Supabase. Install Chromium using `npx playwright install chromium` if necessary, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium` to use an installed Chromium.
- `npm run test:unit`: Vitest/React Testing Library guest error/confirmation paths.
- `npm run test:email`: signature/replay/template/image-validation tests with controlled inputs.
- `npm run test:administration`: persisted CMS CRUD, private preview/publish and team roles.
- `npm run test:operations`: media/moderation/QR/check-in/seating and notification integration.
- `npm run test:release`: SEO, security headers, client-secret exclusion and atomic bulk publication.
- `npm run test:all`: application checks and every local acceptance suite sequentially.
- `npm run verify:release`: secret-safe production configuration inspection; exits nonzero on missing setup. It does not deploy, send email or charge a payment.
- `npm run test:payments`: controlled payment/signature/transport tests; does not contact Paystack.
- `npm run verify:paystack`: explicit sandbox-only verification against a configured real Paystack account and public webhook; see manual-resolution.md first.
- `npm run test:invitations`: Phase 4 CSV/RSVP/rate-limit/delivery tests against local Supabase and a production server; real sending is disabled in this test process.
- `npm run test:public`: production HTTP acceptance checks using real local Supabase (build first).
- `npm run verify:connection`: real Auth and database API connectivity.

## Supabase workflow

Configuration is tracked in `supabase/config.toml`. Run `npx supabase migration new <name>` to create an ordered migration. Migrations 001–015 implement the schema, security, transactional routines, storage, invitations, inventory, draft publication, advanced operations and release hardening. See [database notes](docs/database.md).

- `npm run db:reset` recreates the **local** database and applies migrations/seed. This destroys local development records; do not use it against production.
- `npm run db:lint` checks the running local database.
- `npm run db:types` generates TypeScript definitions from the local schema, replacing the file only after successful generation. Browser/server/proxy clients use these generated types.
- `npm run supabase:stop` stops this project's containers while retaining local data.

For hosted development, link explicitly using `npx supabase link --project-ref <development-project-ref>`. Review migrations with `npx supabase db push --dry-run` before `npx supabase db push`. Do not link or push to production during foundational development. Generated types and reviewed migration SQL belong in source control; credentials do not.

## Database validation

`npm run test:database` runs real Supabase integration checks and requires Docker plus the complete local database/Auth/REST/Storage stack. It creates uniquely named local test accounts/workspaces and retains them until a deliberate local database reset. It refuses non-local API hosts. Do not point it at production. `npm run db:seed` creates separate development accounts with generated local credentials. No shared test password is committed.

## Structure

- `src/app/(public)`: shared public layout and platform entry page.
- `src/app/(auth)`: sign-in and server authentication actions.
- `src/app/admin`: protected tenant workspace, visual CMS, reports and wedding operations.
- `src/components/ui`: Shadcn-compatible controls with Radix composition.
- `src/lib/supabase`: browser/server Supabase clients.
- `src/proxy.ts`: cookie refresh and anonymous admin redirect.
- `supabase`: CLI configuration and migration workflow.
- `tests/e2e`: desktop/mobile foundation, authentication, CMS publication, RSVP, reservations, moderation and gallery interaction checks.

See [architecture decisions](docs/architecture.md). See [manual-resolution notes](docs/manual-resolution.md) for outstanding account/device/deployment checks. Local passing tests do not establish a production deployment.

## Publication and communication

Website identity/content/theme edits are saved as drafts. Use the private preview before publishing. Content records have independent draft and publication actions, including atomic bulk publication; public rendering never inherits member permissions. Media bytes remain private until explicitly published, and albums/photographs have separate visibility controls.

The worker endpoint is `/api/cron/notifications`; it requires `Authorization: Bearer <CRON_SECRET>`. `vercel.json` proposes a five-minute schedule; activate it only after the intended production environment and provider setup are verified. The communication dashboard shows queue status separately from verified delivery status. See the production runbook for leases, retries, exhausted jobs, suppression and recovery.

The production dependency audit is clean. A targeted minimatch override for the TypeScript ESLint parser avoids a development-only denial-of-service advisory without downgrading the Next.js lint configuration. Lint/typecheck and the complete audit validate the override.
