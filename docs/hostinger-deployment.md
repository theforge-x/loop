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

Use **hPanel Cron Jobs** to call Loop's notification worker every five minutes. This works when Loop runs on Hostinger and when Hostinger only supplies the schedule for a Loop app that still runs on Vercel. Each authenticated `GET /api/cron/notifications` processes up to 10 due notifications and clears expired request-limit records. Complete the provider and recovery checks before sending a test notification or enabling the schedule.

### Prepare the authenticated request

1. Confirm the production app's canonical HTTPS origin and its private `CRON_SECRET`. Use the value from the environment that actually serves Loop. If you need to set a new value, configure a random secret of at least 32 characters in that environment and deploy it first.
2. Enable SSH from the Hostinger site's **Advanced → SSH Access** and connect using the command shown in hPanel. Run the following on the Hostinger account. `command -v curl` prints the executable path to use in the cron command. [Hostinger SSH setup](https://support.hostinger.com/en/articles/1583645-how-to-enable-ssh-access)

   ```sh
   umask 077
   mkdir -p "$HOME/.loop-cron"
   chmod 700 "$HOME/.loop-cron"
   touch "$HOME/.loop-cron/notifications.curl"
   chmod 600 "$HOME/.loop-cron/notifications.curl"
   command -v curl
   printf '%s\n' "$HOME/.loop-cron/notifications.curl"
   ```

3. Open `~/.loop-cron/notifications.curl` in a terminal editor. Replace `loop.example.com` with Loop's final HTTPS hostname and `REPLACE_WITH_CRON_SECRET` with its production secret. Keep this file outside `public_html` and the deployed source. The hPanel command contains only its path, so the secret stays out of the command field, request URL and logs. [curl configuration reference](https://curl.se/docs/manpage.html#-K)

   ```text
   url = "https://loop.example.com/api/cron/notifications"
   header = "Authorization: Bearer REPLACE_WITH_CRON_SECRET"
   connect-timeout = 10
   max-time = 240
   silent
   show-error
   fail
   output = "/dev/null"
   write-out = "Loop notification worker HTTP %{http_code}\n"
   ```

### Cut over and save the hPanel job

1. If Vercel currently owns the schedule, release the revision with the `crons` entry removed from `vercel.json`. Check **Settings → Cron Jobs** on the Vercel project after the production deployment. Disable any remaining Vercel trigger and any GitHub Actions or Supabase job that calls this worker before enabling hPanel. Vercel Hobby allows its built-in schedules to run once per day. An hPanel job can still call a Vercel-hosted worker every five minutes as an ordinary HTTP request. [Vercel cron limits](https://vercel.com/docs/schedules/cron-jobs/usage-and-pricing#hobby-scheduling-limits)
2. Run the command once over Hostinger SSH. Use the two absolute paths printed during setup. This is a real worker run and can send queued email. Expect `Loop notification worker HTTP 200`.

   ```sh
   /usr/bin/curl -q --config /home/u123456789/.loop-cron/notifications.curl
   ```

3. In **hPanel → Websites → Manage site → Advanced → Cron Jobs**, choose **Custom** if hPanel offers a type selector. Enter that same command in **Command to run**. For a managed Node.js site, replace the prefilled Node command with the curl command. Set the minute to `*/5` and the hour, day, month and weekday to `*` (`*/5 * * * *`). Save. hPanel uses UTC. [Hostinger cron setup](https://www.hostinger.com/support/1583465-how-to-set-up-a-cron-job-at-hostinger/) · [Calling a URL from a Node.js site's cron](https://www.hostinger.com/support/how-to-run-cron-jobs-for-node-js-websites-at-hostinger/)

### Verify, troubleshoot and pause

- After the next five-minute boundary, open **Cron Jobs → View Output** and check for HTTP `200`. In Loop's private communication dashboard, confirm that a controlled queued notification was processed and check its delivery status. A `200` also occurs when the queue is empty. [Hostinger cron output](https://www.hostinger.com/support/5647075-how-to-check-the-output-of-a-cron-job-at-hostinger/)
- `301` or `308` means the request reached a redirect. Update the config to the final URL. `401` from the worker means its bearer secret did not match. `404` points to the origin, path or deployed revision. For `503`, check the deployed secret and server logs for database or maintenance errors. `000` means curl received no HTTP response. Check the error line, DNS, TLS, file paths and permissions. If hPanel output is empty, rerun the exact command over SSH.
- If a run times out, check the worker and provider logs before rerunning. A provider may have accepted an email even if the scheduler saw a timeout. The target host's HTTP request limit still applies. Hostinger managed Node.js hosting documents a 120-second HTTP request limit. [Hostinger Node.js limits](https://www.hostinger.com/support/hostinger-node-js-limits-for-web-and-cloud-plans/)
- To pause, remove the hPanel job under **Cron Jobs**. The private config file can stay for reuse. If rolling back Vercel to a release that declared the old cron, check whether Vercel restored it before re-enabling hPanel. [Vercel rollback behavior](https://vercel.com/docs/instant-rollback)

### GitHub Actions alternative

The optional `.github/workflows/hostinger-notifications.yml` can call the same endpoint every five minutes on either host. It starts disabled and can also be dispatched manually. Use it in place of the hPanel job.

1. Create the GitHub Actions environment `hostinger-production` with access restricted to the intended release branch. Ensure its protection rules permit unattended scheduled runs.
2. In that environment, set variable `HOSTINGER_APP_URL` to the final HTTPS origin and secret `HOSTINGER_CRON_SECRET` to exactly the app's `CRON_SECRET`.
3. Set the **repository** Actions variable `HOSTINGER_NOTIFICATIONS_ENABLED=true`. This opt-in is evaluated before the job enters its environment.
4. Ensure the workflow exists on the default branch. Run it manually once and verify queue processing and provider delivery in the private dashboard/logs. Monitor failed and exhausted jobs.

The runner sends `Authorization: Bearer ...`, refuses redirects, times out after five minutes and does not print secrets or response bodies. It installs no application dependencies. Overlapping runs are serialized. GitHub scheduled jobs may be delayed or disabled under GitHub's scheduling policies; this is best-effort processing rather than an exact five-minute guarantee. See [GitHub scheduled workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

To pause this workflow, set `HOSTINGER_NOTIFICATIONS_ENABLED=false`.

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
