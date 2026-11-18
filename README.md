# Loop

Wedding website and management platform, built sequentially from [the specification](docs/wedding_web_app_implementation_specification.docx).

## Current scope

Phases 1–7 are implemented with real Supabase-backed public pages, invitations/RSVP, registry/payments, a visual administration CMS, draft preview/publication, media, moderation, seating, QR check-in and communication queues. Phase 8 adds security/SEO checks, component and browser tests, CI and deployment/recovery tooling. Actual Paystack sandbox verification, live Resend delivery, production configuration/deployment and physical-camera QA require manual setup and remain flagged. See [implementation status](docs/implementation-status.md), [manual checks](docs/manual-resolution.md) and the [production runbook](docs/production-runbook.md).

## Requirements

- Node.js matching `package.json` (Node 24 LTS recommended), pnpm 11.24.0, and Docker for local Supabase.
- A local Supabase stack or your own development Supabase project.

## Run locally

1. Run `pnpm install --frozen-lockfile`.
2. Start Docker, then run `pnpm supabase:start` (first run downloads containers).
3. Copy `.env.example` to `.env.local`. From `pnpm supabase:status`, set `NEXT_PUBLIC_SUPABASE_URL` to the API URL and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the local anon key. Keep these values local. Alternatively use a development Supabase project's URL and anon key.
4. Run `pnpm verify:connection`. Both Auth settings and the database REST endpoint must pass.
5. Run `pnpm dev` and open http://localhost:3000.

Apply the database using `pnpm exec supabase migration up --local`, then run `pnpm db:seed` for local-only development fixtures. That command uses real Supabase Auth accounts and stores generated credentials in ignored `.local-dev-accounts.json` (mode 0600). It refuses non-local API hosts. Fixtures are never loaded by the production application. Authenticated members can open the overview, website/theme editor, content modules, guests, registry, media, communication, moderation, seating/check-in, payments and team controls. New users can register at `/sign-up` and create their first private wedding at `/admin/new`; existing users can create additional weddings from `/admin`.

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

- `pnpm lint`: ESLint with zero warnings allowed.
- `pnpm typecheck`: strict TypeScript.
- `pnpm build`: production compilation and route generation.
- `pnpm test:e2e`: production-server browser checks on desktop and mobile. Build first and configure Supabase. Install Chromium using `pnpm exec playwright install chromium` if necessary, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium` to use an installed Chromium.
- `pnpm test:unit`: Vitest/React Testing Library guest error/confirmation paths.
- `pnpm test:email`: signature/replay/template/image-validation tests with controlled inputs.
- `pnpm test:administration`: persisted CMS CRUD, private preview/publish and team roles.
- `pnpm test:operations`: media/moderation/QR/check-in/seating and notification integration.
- `pnpm test:release`: SEO, security headers, client-secret exclusion and atomic bulk publication.
- `pnpm test:all`: application checks and every local acceptance suite sequentially.
- `pnpm verify:release`: secret-safe production configuration inspection; supports `--mode test|live`, optional read-only deployed `--smoke` checks and `--report NEW_PRIVATE_FILE`. Exits nonzero on incomplete setup; never deploys, sends email or charges a payment.
- `pnpm release:prepare`: writes a private, ignored readiness report with automated results and OPEN manual gates. See the [step-by-step production runbook](docs/production-runbook.md).
- `pnpm test:release-tooling`: isolated tests for readiness checks, safe HTTP requests and private evidence reports.
- `pnpm test:payments`: controlled payment/signature/transport tests; does not contact Paystack.
- `pnpm verify:paystack`: explicit sandbox-only verification against a configured real Paystack account and public webhook; see manual-resolution.md first.
- `pnpm test:invitations`: Phase 4 CSV/RSVP/rate-limit/delivery tests against local Supabase and a production server; real sending is disabled in this test process.
- `pnpm test:public`: production HTTP acceptance checks using real local Supabase (build first).
- `pnpm verify:connection`: real Auth and database API connectivity.

## Supabase workflow

Configuration is tracked in `supabase/config.toml`. Run `pnpm exec supabase migration new <name>` to create an ordered migration. Migrations 001–015 implement the schema, security, transactional routines, storage, invitations, inventory, draft publication, advanced operations and release hardening. See [database notes](docs/database.md).

- `pnpm db:reset` recreates the **local** database and applies migrations/seed. This destroys local development records; do not use it against production.
- `pnpm db:lint` checks the running local database.
- `pnpm db:types` generates TypeScript definitions from the local schema, replacing the file only after successful generation. Browser/server/proxy clients use these generated types.
- `pnpm supabase:stop` stops this project's containers while retaining local data.

For hosted development, link explicitly using `pnpm exec supabase link --project-ref <development-project-ref>`. Review migrations with `pnpm exec supabase db push --dry-run` before `pnpm exec supabase db push`. Do not link or push to production during foundational development. Generated types and reviewed migration SQL belong in source control; credentials do not.

## Database validation

`pnpm test:database` runs real Supabase integration checks and requires Docker plus the complete local database/Auth/REST/Storage stack. It creates uniquely named local test accounts/workspaces and retains them until a deliberate local database reset. It refuses non-local API hosts. Do not point it at production. `pnpm db:seed` creates separate development accounts with generated local credentials. No shared test password is committed.

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

## New-user onboarding

Open `/sign-up`, enter an email and a password of at least 12 characters, then create a wedding with both partner names, a title and a unique lowercase URL slug. Creation assigns the authenticated user as owner and opens Website & theme. New weddings stay unpublished until explicitly previewed/published. The landing page and sign-in page link to registration; `/admin` always offers Create wedding. Duplicate/reserved URL names return actionable errors.

Local Supabase has email confirmation disabled by default, so registration signs in immediately. Hosted Supabase should enable email/password signup and confirmation with a configured Auth email sender. Set Auth Site URL to NEXT_PUBLIC_APP_URL and allow `<origin>/auth/confirm` in redirect URLs. The default PKCE confirmation link must be opened in the browser that registered. For confirmation across browsers/devices, set the Confirm signup template link to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`. The callback accepts both methods, establishes the session and redirects only to wedding setup. Invalid/expired/replayed links show recovery instructions. Auth emails use Supabase Auth mail settings, independently of the app's Resend notification transport. See [Supabase's Next.js Auth tutorial](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs). Restart local Supabase after changing its redirect configuration.

Run `pnpm exec playwright test tests/e2e/onboarding.spec.mjs` after building. For the onboarding suite, set `PLAYWRIGHT_PORT=3106` to use an isolated production server when port 3000 is occupied. If you intentionally want to test the development server already running on port 3000, use `PLAYWRIGHT_REUSE_SERVER=true pnpm exec playwright test tests/e2e/onboarding.spec.mjs`. The tests require local Auth confirmation disabled for immediate signup and separately verify real token-hash confirmation/replay rejection.

## Hostinger Business alternative

Deploy the full Next.js app using Hostinger Business managed Node.js hosting, with Supabase retained for database/Auth/Storage. See the [Hostinger deployment guide](docs/hostinger-deployment.md) for hPanel settings, environment configuration, Git or private source-archive upload, optional notification scheduling, verification and rollback. Run `pnpm build:hostinger` in the configured hosting environment, `pnpm package:hostinger` for an upload archive, and `pnpm test:hostinger` for isolated deployment-tooling tests. The existing Vercel configuration remains available.
