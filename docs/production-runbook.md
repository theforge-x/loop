# Deployment and recovery runbook

For a Hostinger Business deployment, follow the [Hostinger deployment guide](hostinger-deployment.md) alongside these release and recovery gates. The guide also covers using hPanel to schedule the worker for a Vercel deployment.

## Release evidence and pending gates

Use implementation-status.md for the actual test results, and manual-resolution.md for checks requiring account/device access. A local build, configured secret or controlled webhook is not proof of a production deployment. Do not enable monetary contributions until the real Paystack sandbox gate has passed. Live mode also requires its own controlled production verification.

## Source and isolated environments

The Git remote is `git@github.com:theforge-x/loop.git`; changes are committed locally as `theForge <hello@theforge.ng>`. The GitHub workflow runs on Ubuntu with Node 24, real isolated Supabase, all integration tests and desktop/mobile Playwright. It uses generated local credentials, never production credentials, and does not send real emails or initialize provider payments. CI has to run on GitHub before claiming a remote CI pass. Review changes before pushing. Keep `.env.local`, local development account files, payment verifier output and browser traces private. Traces can contain invitation and cancellation tokens.

Use separate Supabase development/staging and production projects, with isolated Vercel environment variables. Follow [Supabase environment management](https://supabase.com/docs/guides/deployment/managing-environments). No hosted project is currently linked by this work. Never run database test/seed/reset scripts against hosted projects; their local-host guards are intentional.

## How to use this runbook

A release has three separate results: the source passes isolated tests, the deployed configuration passes inspection, and an operator verifies the real service. None implies the next. Work through steps 1–8 in order; retain evidence for the same commit and final environment. Recheck affected steps after changing a domain, credential, schema or deployment.

**Automated** means a checked-in command performs repeatable work. **Manual** means an operator selects accounts, reviews changes, completes a provider/device interaction or accepts the result. **Operator-triggered** commands perform external changes and run only after their preceding gate. This repository does not have selected production accounts, hosted credentials or recorded external release evidence; those gates remain open.

### Commands available now

```sh
# Isolated local environment only: full application and acceptance suites.
pnpm test:all
pnpm test:release-tooling

# Production settings supplied privately by the operator or deployment runner.
# Defaults to live Paystack mode; configuration inspection only, no network.
pnpm verify:release

# Before live activation: validate matching test keys instead.
pnpm verify:release --mode test

# Add six anonymous, read-only HTTPS requests against NEXT_PUBLIC_APP_URL.
pnpm verify:release --smoke

# Save a private, non-overwriting report; optionally add --mode test or --smoke.
pnpm release:prepare
```

The commands load `.env.local` if present. Existing process environment variables take precedence; use a clean shell/job with the intended environment to avoid accidentally mixing local and hosted values. Fetching production variables is an operator/secret-manager action, not part of these commands. Do not print or commit the resulting environment.

`release:prepare` writes ignored `.local-release-readiness.json` with file permissions 0600. It records UTC time, local Git commit/dirty status, mode, check results and OPEN manual gates; it never stores environment values or HTTP bodies. The Git revision describes the inspected checkout, **not proof of the deployed revision**. Archive the report privately and use a new ignored path for later runs:

```sh
pnpm verify:release --smoke --report .local-release-final.json
```

An existing report is never overwritten. Exit 0 means the requested automated checks passed; exit 1 means a check or report write failed; exit 2 means invalid arguments. Reports always set `productionReady: false`: attach operator sign-off and private evidence references separately. A green configuration result cannot close a manual gate.

The HTTPS checks request `/`, `/sign-in`, `/sign-up`, `/robots.txt`, `/sitemap.xml` and `/admin`, verify expected statuses/types, homepage security headers and the anonymous admin redirect to same-origin `/sign-in`. Each request times out after ten seconds. They send no credentials, follow no redirects and invoke no worker, email, payment or mutation endpoint. A protected preview or redirecting alias will fail; test the accessible canonical origin. This does not inspect DNS records, alternate-domain redirects, wedding metadata, inboxes, database RLS or authenticated workflows.

## Deployment sequence

### 1. Select projects and configure authentication

**Why:** credentials, Auth callbacks and data must all belong to the intended environment.

**Manual:** select dedicated production Supabase and Vercel accounts/projects. Record identifiers, responsible operator and final HTTPS origin privately. Keep development/staging isolated. Enable email/password registration and confirmation in Supabase Auth, configure its sender, set Site URL to the final origin and allow `<origin>/auth/confirm`. Use the README token-hash email template for cross-device confirmation. Create trusted team accounts; users register at `/sign-up` and create a wedding at `/admin/new`, where `create_wedding` establishes owner membership. Do not share administrator passwords or create public guest Auth accounts.

**Automated:** isolated CI already tests signup, confirmation/replay handling and owner/private defaults. The readiness command validates URL shape; it cannot inspect dashboard selections or Auth email settings.

**Evidence/stop condition:** record project references privately and verify real confirmation on another browser/device, sign-in/out and owner membership. Stop if the selected accounts or callback origin are uncertain.

### 2. Back up, review and apply the database

**Why:** a deploy can succeed while using an incompatible schema or insecure tenant policies.

**Manual:** inventory the existing schema and migration history, review migrations 001–015 and confirm a recoverable backup, independent Storage object backup and restore rehearsal before changes. Choose recovery targets and retention with the operator. Review the exact dry-run plan and compatibility with both the new and rollback app versions. Never edit an applied migration, reset production or seed hosted fixtures.

**Operator-triggered:** use the CLI installed from the frozen lockfile. Link explicitly, inspect history and produce a plan before applying:

```sh
pnpm exec supabase link --project-ref <confirmed-production-project-ref>
pnpm exec supabase migration list --remote
pnpm exec supabase db push --remote --skip-vault --dry-run
# Only after the plan and backup have been reviewed:
pnpm exec supabase db push --remote --skip-vault
pnpm exec supabase migration list --remote
pnpm exec supabase db lint --remote --fail-on warning
```

The link persists locally; confirm the project before every hosted command. Supabase v3 defaults database commands to local, so the explicit `--remote` flag is required. `--skip-vault` limits these pushes to migrations; review Vault changes separately if needed. These commands are deliberately not invoked by `release:prepare`. CI automatically applies migrations and lints an isolated local Supabase database; that result is not hosted verification. See [Supabase environment management](https://supabase.com/docs/guides/deployment/managing-environments).

**Evidence/stop condition:** retain reviewed plan, before/after migration versions, lint outcome, backup/rehearsal reference and controlled hosted RLS/Storage checks for two tenants. Stop on unexpected migrations, failed lint, cross-tenant access or an unverified recovery path.

### 3. Set environment variables and proxy policy

**Manual:** enter values in the correct Vercel environment scopes: canonical `NEXT_PUBLIC_APP_URL`, matching hosted Supabase URL/anon key, server-only service-role key, `NEXT_PUBLIC_DEFAULT_TIMEZONE`, random independent `RATE_LIMIT_SECRET` and `CRON_SECRET` of at least 32 characters. Keep private keys free of a public prefix. Configure provider values in step 4. Leave `TRUST_PROXY_HEADERS=false` until the actual proxy is verified to overwrite client forwarding headers; then explicitly select `true` if appropriate. Redeploy after changes to build-time public variables.

**Automated:** `pnpm verify:release` validates HTTPS origins without paths/credentials, required settings, secret lengths, timezone, explicit proxy boolean, sender format, matching payment modes and suspicious public variable names. It reports check names without values. These are syntax/presence checks, not credential authentication or entropy verification.

**Evidence/stop condition:** attach a readiness report from the intended environment and record secret-manager/version references privately. Confirm that all values belong to the same project and mode; stop on any failed check.

### 4. Verify email and payments

**Manual:** verify the Resend sender domain and configure `RESEND_API_KEY`, `RESEND_FROM_EMAIL` and `RESEND_WEBHOOK_SECRET`. Configure Resend events at `<origin>/api/email/resend/webhook`. Supabase Auth sending is configured separately. Configure Paystack test credentials and `<origin>/api/payments/paystack/webhook`; set current/previous signing secrets according to the application's supported integration/rotation mode. Follow the detailed procedure in manual-resolution.md. Never log raw card data or signing secrets.

**Automated after isolated setup:** `pnpm verify:paystack` initializes a real test checkout and waits for independent provider verification plus exactly one committed webhook event. It refuses live keys and its fixture helper refuses hosted databases. Use a local isolated Supabase stack, private test credentials and a controlled public HTTPS tunnel; never point this fixture-based command at production. A person must complete the test checkout. The command creates test data and private `.local-paystack-verification.json`; see manual-resolution.md for reconciliation/cleanup. Controlled payment/email unit tests run automatically in CI but do not prove real provider acceptance.

**Manual:** send a controlled invitation and Auth confirmation, inspect actual inbox receipt, provider ID and verified delivery event; verify bounce/complaint suppression using controlled recipients. For live Paystack, complete provider activation, configure matching `sk_live_`/`pk_live_` keys, and agree a small controlled transaction and reconciliation with the operator. Record amount/currency/reference/transaction-ID matching and signed webhook uniqueness. Do not improvise a live fixture or mark a payment successful manually.

**Evidence/stop condition:** sandbox proof is required before enabling contributions; live mode also needs its own recorded controlled verification. Keep contributions disabled for normal guests until both required gates pass. A present API key, checkout redirect or `sent` email status does not close these gates.

### 5. Deploy a preview and configure scheduling

**Manual:** connect the intended repository/project/account in Vercel, isolate preview and production environment variables, and deploy a reviewed commit. Confirm the actual remote GitHub CI run passed for that commit. Review before pushing. Configure the scheduler only on the intended production deployment after provider and recovery setup is ready.

**Automated:** `.github/workflows/ci.yml` installs the frozen pnpm dependency tree, starts real isolated Supabase, generates private local credentials, checks connectivity/lint/build/types and runs unit, payment, email, database, workflow, release-tooling and desktop/mobile browser suites. `vercel.json` selects Next.js and runs the full application check as the build gate. The notification schedule is configured separately in the scheduler account.

**Manual:** use one external scheduler to send an authenticated `GET /api/cron/notifications` every five minutes. Follow the [hPanel cron setup and verification](hostinger-deployment.md#4-schedule-notification-processing) if using Hostinger. Confirm the target host's function duration and the scheduler's request timeout. During a cutover, disable the previous scheduler before enabling its replacement. Atomic leases prevent concurrent claims, and a timeout can still occur after a provider accepts an email.

**Evidence/stop condition:** retain remote CI/deployment references, deployed commit and observed authenticated scheduled execution. Readiness checks never invoke the worker because doing so can send queued email.

### 6. Run and retain automated readiness checks

**Automated:** run `pnpm release:prepare --mode test` during provider staging, then `pnpm verify:release --mode live --smoke --report .local-release-final.json` with the final private environment after live configuration. A failed check exits nonzero and names the missing/invalid requirement. Fix the underlying issue and generate new evidence. Use `pnpm test:release-tooling` to validate the inspection tooling without providers or Supabase.

**Manual:** compare the report revision with the deployed commit, inspect any dirty checkout status, and attach external evidence to each OPEN gate in the release record. Do not equate an exit 0 with deployment, inbox delivery, payment correctness or release approval.

### 7. Finalize the domain and monitoring

**Manual:** add the domain in the hosting account, apply its requested DNS records and verify certificate issuance, HTTPS and canonical redirects from aliases/HTTP. Update the Auth allowlist, provider webhook destinations and `NEXT_PUBLIC_APP_URL` consistently; redeploy for the final origin. Configure error/uptime alerts, worker failures/exhausted jobs, provider webhook failures and backup failures. Trigger controlled alert conditions and confirm receipt. Diagnostic tooling must exclude invitation bodies, raw tokens, card data and secrets.

**Automated:** rerun `--smoke` against the final canonical origin. Existing local release tests check canonical/structured metadata, robots/sitemap privacy and client-secret exclusion. Use hosting/provider monitoring for ongoing alerts; no external monitoring integration is provisioned by this repository.

**Evidence/stop condition:** record DNS/HTTPS/redirect observations, final deployment reference and delivered alert evidence. Stop on redirect loops, wrong canonical origin or missing alert delivery.

### 8. Accept the hosted service and authorize launch

**Manual with controlled records:** verify sign-in/out and cross-device confirmation; two-tenant access isolation; private drafts and explicit publication; public navigation/mobile/keyboard behavior; invitation revocation/expiry; RSVP allowances; gift concurrency/private cancellation; image upload/private/public access; guestbook moderation; unique QR check-in; seating capacity; CSV reports; and real email events. Test camera permissions/scanning on a physical HTTPS device, and measure deployed mobile network/rendering performance. Run the operator-agreed financial flow before enabling public contributions.

**Automated:** the same broad workflows already run against isolated local Supabase in CI, including desktop/mobile browser viewports. Do not run fixture-based integration suites against hosted production; the deployed smoke command is the read-only production subset. Hosting-specific RLS, real devices and provider interactions still need evidence.

**Evidence/stop condition:** record operator, UTC timestamps, commit/deployment, schema versions, outcomes and private evidence references. Record backup/recovery targets and the compatible rollback commit. The operator signs off only when required manual gates and automated checks pass; otherwise keep the affected capability disabled and the release blocked.

## Notification operations

A worker request needs `Authorization: Bearer <CRON_SECRET>`. Vercel supports this secret convention; see [securing cron jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs). Pending/failed jobs become eligible at next_attempt_at. Claims lease a job for 90 seconds, increment attempts atomically and recover expired leases. Eight attempts is the ceiling. The authenticated dashboard can force a retry before the next due time; fix the cause before retrying. Email status `sent` means provider acceptance, while delivery_status tracks verified delivery, delay, bounce, complaint or suppression. Permanent bounce/complaint recipients are suppressed for that wedding; review legitimate removals through a trusted audited operational process. Never delete replay history to force a financial webhook through.

## Backup, restore and rollback

Choose the required recovery point/time with the operator before launch. Configure database backup retention/PITR suitable for those targets, verify the project plan supports them, and record the last successful restore rehearsal. Follow [Supabase backups](https://supabase.com/docs/guides/platform/backups). Database backups contain storage metadata, **not the actual Storage objects**; back up wedding-media objects independently with a manifest and restore them to their recorded paths. Store backups encrypted with limited access and tested retention. Include application migration versions, Auth configuration, provider/webhook configuration references and secret-manager recovery instructions; keep credentials out of source control.

For a recovery rehearsal, restore into a new isolated project, restore matching object bytes, configure isolated test provider credentials and disable external sends/schedules. Verify Auth, RLS, tenant separation, invitation hashes, RSVPs, reservations, contribution/webhook uniqueness, media integrity, moderation, seating/check-in and audit history. Reconcile payments with Paystack and notification state with Resend before resuming workers; restoring an earlier database may replay previously accepted external events. Record achieved recovery point/time and cleanup steps. No actual production restore has been performed here.

For an application rollback, redeploy the previous verified application commit only if its schema expectations remain compatible. Stop publication, contributions and communication during an incident as appropriate. Prefer an additive corrective migration over destructive down-migrations. If database recovery is required, coordinate the verified backup/restore procedure and provider reconciliation first. Audit history is append-only and should not be erased to work around a failed change.

## Performance and bounded interfaces

Public routes use bounded queries, responsive optimized images, dynamic canonical metadata and an anonymous client. The CMS and payment/media/log lists paginate. Choice/preview/operational views currently bound large supporting collections (100–1000 records); a very large wedding needs scoped searches/reports before relying on those views. CSV operational export refuses potentially truncated supporting results rather than silently exporting them. The sitemap paginates published weddings and refuses more than 5000 weddings until it is split. Capture real mobile performance and bundle/network measurements on the deployed preview; local compilation is not a field-performance result.

Local build measurement (2026-11-09): 29 generated JavaScript chunks total 1,001,398 bytes uncompressed / 331,361 bytes independently gzipped; largest chunk 234,302 bytes / 74,083 bytes gzipped. These are all generated chunks, including separately loaded routes, rather than a per-page transfer measurement. This establishes a review baseline; deployed mobile network, rendering and field metrics remain an explicit manual gate.
