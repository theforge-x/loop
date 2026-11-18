# Hostinger Business deployment

This is an alternative to the Vercel deployment. Loop runs as a **managed Next.js Node.js web app** on Hostinger Business shared hosting. Supabase continues to provide PostgreSQL, Auth and private Storage; Resend and Paystack remain external. Server actions, authentication, signed media and webhooks require a running Node server. A static export uploaded to a PHP/HTML site's `public_html` cannot run this app.

Hostinger documents Business support, Next.js, pnpm, Node 22/24 and Git/archive deployment in its [Node.js deployment guide](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/). Confirm that your Business subscription exposes **Web App** before proceeding. This path requires neither a VPS nor Docker, PM2 or a hand-written `.htaccess`.

## 1. Prepare the release

Use the existing [production runbook](production-runbook.md) for database backups/migrations, authentication, email/payment verification and launch evidence. Substitute the Hostinger website and environment for Vercel in steps 1, 3 and 5. Keep staging isolated. Do not reset or seed a hosted database.

Run `pnpm test:hostinger` and the existing acceptance checks on the reviewed revision. These new deployment tests are also included in CI. The Hostinger build performs configuration checks, lint, typecheck and production compilation; integration tests continue to run in CI against isolated Supabase.

## 2. Create the managed app

In hPanel, open **Websites → Create site → Web App** under your Business plan. Choose your intended domain (or a staging domain), then either import the repository or upload the source archive described below. Review these settings rather than relying only on framework detection:

| Setting | Value |
| --- | --- |
| Framework | Next.js with server/backend support |
| Root directory | Repository root (`.`) |
| Node | 24.x, at least 24.15.0; alternatively 22.x, at least 22.22.2 |
| Package manager | pnpm, using `packageManager` in package.json (11.24.0) |
| Install command, if exposed | `pnpm install --frozen-lockfile` |
| Build command | `pnpm build:hostinger` |
| Output directory, if requested | `.next` |
| Start command, if exposed | `pnpm start` |

Use the Next.js preset's managed startup when no start field is exposed. The existing start script binds to `0.0.0.0`; Next reads the platform's `PORT`. Do not pin a port or select a static frontend preset. If the runtime or package-manager versions differ from this repository's requirements, resolve that before deployment; do not ignore the engine constraint. Hostinger's settings vary by preset and account rollout.

Git import can redeploy on pushes. Select a release branch with required passing CI before merging; auto-deployment itself does not wait for the acceptance workflow. For deliberately selected uploads, run:

```sh
pnpm package:hostinger
```

Upload `.local-hostinger-source.tar.gz` through **Upload your files**. It contains the current working tree's application/configuration and Hostinger scripts, including uncommitted edits, so review the checkout first. It excludes `.env*`, `.git`, node_modules, build caches, local accounts, reports and database fixtures through an explicit allowlist. Source symlinks and obvious private key/environment files inside source directories are refused. Review source for accidentally embedded secrets; packaging cannot detect credentials written into code. Existing archive paths are never overwritten; use a new ignored name for another release:

```sh
pnpm package:hostinger .local-hostinger-release-02.tar.gz
```

Hostinger installs dependencies and builds on its own Linux runtime. Do not upload your local `.next` or `node_modules`. Retain the archive and matching commit/dirty-state evidence privately for rollback.

## 3. Configure the environment before building

Enter the README's environment variables in the app's **Environment Variables** panel. Configure the actual final/staging HTTPS origin, hosted Supabase URL/anon key, service-role key, timezone and independent random `CRON_SECRET`/`RATE_LIMIT_SECRET` (32+ characters). Add the Resend and Paystack settings before enabling those capabilities. Set `TRUST_PROXY_HEADERS=false` until forwarding-header replacement has been verified on this hosting environment.

`build:hostinger` rejects local/incomplete HTTPS configuration, missing Supabase keys, a short/missing cron secret and unsupported Node versions. It does not authenticate provider credentials or establish production readiness. It intentionally reads only process environment variables at preflight, never `.env.local`; use hPanel values. All `NEXT_PUBLIC_*` variables must be present at build time. Rebuild after changing them. Never upload a credential file or use public prefixes for server secrets.

Set Supabase Auth Site URL to the same origin and allow `<origin>/auth/confirm`. Configure Resend events at `<origin>/api/email/resend/webhook` and Paystack at `<origin>/api/payments/paystack/webhook`. Temporary-domain builds need their own matching origin and isolated provider settings; rebuild when switching to the final domain.

## 4. Schedule notification processing

Hostinger does not consume `vercel.json`. The optional `.github/workflows/hostinger-notifications.yml` calls the existing worker every five minutes and can also be dispatched manually. It starts disabled. It sends queued email, so enable it only after the provider and recovery gates pass.

1. Create the GitHub Actions environment `hostinger-production` with access restricted to the intended release branch. Ensure its protection rules permit unattended scheduled runs.
2. In that environment, set variable `HOSTINGER_APP_URL` to the final HTTPS origin and secret `HOSTINGER_CRON_SECRET` to exactly the app's `CRON_SECRET`.
3. Set the **repository** Actions variable `HOSTINGER_NOTIFICATIONS_ENABLED=true`. This opt-in is evaluated before the job enters its environment.
4. Ensure the workflow exists on the default branch. Run it manually once and verify queue processing and provider delivery in the private dashboard/logs. Monitor failed and exhausted jobs.

The runner sends `Authorization: Bearer ...`, refuses redirects, times out after five minutes and does not print secrets or response bodies. It installs no application dependencies. Overlapping runs are serialized. GitHub scheduled jobs may be delayed or disabled under GitHub's scheduling policies; this is best-effort processing rather than an exact five-minute guarantee. See [GitHub scheduled workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

Before switching production from Vercel, stop its cron (and any other worker scheduler) so there is one active scheduler. To pause this workflow, set the enable variable to `false`. An external scheduler may instead send the same authenticated GET to `/api/cron/notifications`; allow enough execution time and verify Hostinger's actual request limits. `maxDuration` in a route is not a Hostinger timeout guarantee.

## 5. Verify and recover

After deployment, retain the hPanel build/deployment reference and matching source revision. With the intended environment supplied privately, use the existing read-only verifier:

```sh
pnpm verify:release --mode test --smoke --report .local-release-hostinger-test.json
# After live-provider verification and final domain configuration:
pnpm verify:release --mode live --smoke --report .local-release-hostinger-live.json
```

Complete the runbook's hosted Auth, two-tenant, media, device, real payment/email and recovery checks. Confirm DNS, TLS and aliases, and watch hPanel CPU/RAM/I/O plus worker/webhook failures under representative load. Shared resources and request limits must be measured for this app; local compilation does not establish plan capacity.

For application rollback, disable scheduling as needed and redeploy the previous reviewed Git revision or retained source archive with compatible schema and environment. Rebuilding an archive also requires its original build-time public values. Database/Storage restore and provider reconciliation follow the production runbook; an application rollback does not restore data. Hosting-managed deployment files should be changed in source and redeployed.

No Hostinger account, domain, secrets, remote deployment or scheduler activation is provisioned by these repository changes.
