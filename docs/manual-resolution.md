# Deferred infrastructure and browser verification

## User-approved scope

The initial instruction required each phase to meet its definition of done. The user subsequently instructed the agent to document browser and Supabase setup issues, provide recommendations, test everything else, and proceed to Phase 2. These items may be deferred under that instruction; deferred checks are not reported as passing. Database integrity, RLS, transactions, and financial workflows must still receive explicit evidence before being described as validated.

## Browser acceptance checks — unresolved

### Environment and expected behavior

Next.js 16.4.5 production build; Node 26.13.0; npm 12.2.1; Linux/Arch environment. Playwright 1.64.1. Public tests expect `/` to show the platform heading and workspace link without horizontal overflow, and unknown routes to return 404 with a working home link. The same checks target desktop Chrome and iPhone-sized Chromium viewports. Separate authentication tests require a functioning Supabase stack.

### Observed results

1. The installed `/usr/bin/chromium` launcher timed out. Logs included invalid D-Bus session address messages, X display authorization failures, ANGLE/Vulkan initialization failures, and GPU process exits.
2. Direct `/usr/lib/chromium/chromium` with headless Ozone and GPU disabled also timed out after 30 seconds.
3. An isolated `dbus-run-session`, with DISPLAY and WAYLAND_DISPLAY removed and software rasterization disabled, removed the desktop-session errors but still did not establish a usable browser connection within 30 seconds.
4. Playwright's official Chrome Headless Shell 156.0.8078.4 (revision 1248) was installed. Arch is not officially supported by Playwright, so its installer selected the Ubuntu 24.04 x64 fallback. The initial 120 MiB download timed out and retried; a later attempt completed, along with FFmpeg 1013.
5. With that browser, the four public checks failed before completing their page assertions. The first run timed out navigating to `/` or creating a page at the default 30-second test limit.
6. A focused desktop run with one worker and a 90-second timeout reached `page.goto('/')` but timed out waiting for the expected level-one heading. This is an unresolved browser/loaded-page problem, not evidence that the UI assertions passed. The exact root cause has not been established.
7. Independent production-server HTTP checks passed: `/` returned 200 with expected heading text in its HTML; an unknown route returned 404 with expected recovery content. ESLint, strict TypeScript, and production build passed. These checks do not prove hydration, responsive rendering, or browser accessibility behavior.

### Reproduction

Run `npm ci`, `npm run build`, `npx playwright install chromium --only-shell`, then:

```sh
npm run test:e2e -- --project=desktop --grep 'public foundation' --reporter=line
npm run test:e2e -- --grep 'public foundation|unknown routes' --reporter=line
```

`playwright.config.ts` currently uses one worker and a 90-second test timeout for this machine. It supports an explicit `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` override; leave the override unset to use Playwright's downloaded browser.

Local diagnostic files (temporary; copy elsewhere before cleanup): `/tmp/loop-public-browser.log`, `/tmp/loop-browser-focused.log`, `/tmp/loop-playwright-install.log`, `/tmp/loop-chromium-direct.log`. The latest focused Playwright trace is `test-results/foundation-public-foundati-28882-without-horizontal-overflow-desktop/trace.zip`; each new run may replace it. Open with `npx playwright show-trace <path>`. Trace artifacts are ignored by Git.

### Recommendations

- First rerun in a supported Ubuntu environment with Playwright's matching browser/dependencies, or in the official Playwright container matching the installed package version. Avoid adding random system Chromium flags to application code.
- Inspect the trace's document response, final URL, page snapshot, request failures, browser console, and JavaScript errors. Compare the browser response with a direct HTTP request. Determine whether the loaded page is empty, redirected, blocked, or failing hydration before editing UI components.
- Check proxy settings, localhost reachability from the browser/container, desktop-session environment variables, and browser subprocess permissions. The diagnostics above identify symptoms, not a proven network or application cause.
- Check machine load and run one worker. Raising timeouts alone is not a fix; restore a practical timeout when the underlying issue is understood.
- After the public checks pass, run the authentication checks against the real local Supabase instance. Verify anonymous `/admin` redirects and rejected credentials; then add authenticated workspace checks with controlled local accounts in the database phase.
- Verify screenshots at narrow and wide widths, keyboard navigation, focus states, and reduced motion manually until browser automation is reliable.

## Local Supabase startup — RESOLVED locally

No existing hosted development project was available; the user confirmed this. The project uses the real Supabase CLI and official local images, with no substitute backend or mock database connection.

The first startup failed pulling PostgreSQL `17.11.0.011` and Kong `2.8.1`. Docker reported connection timeouts and DNS failures resolving `public.ecr.aws`, `ghcr.io`, and `registry-1.docker.io`. Auth and PostgREST images downloaded successfully. A second startup reused downloaded layers. The PostgreSQL image subsequently completed and `supabase_db_loop` entered its initial health-starting state. Successful image download is not a verified application connection.

Commands used for the lean Phase 1 stack:

```sh
npx --no-install supabase start -x studio,imgproxy,edge-runtime,logflare,vector,realtime,supavisor,postgres-meta,storage-api,mailpit
```

Excluded services are not validated by that command. Phase 2 storage tests need the Storage service; Studio and local mail testing can also be enabled when needed. Full startup uses `npm run supabase:start`.

Startup logs: `/tmp/loop-supabase-start.log` (initial failure) and `/tmp/loop-supabase-retry.log` (retry). They may contain local connection details after startup; do not publish them without reviewing/redacting credentials.

### Recommendations and verification

1. Ensure Docker is running and the host/daemon can resolve the registries above. Repair network/DNS settings rather than replacing the project with fabricated credentials.
2. Retry `npm run supabase:start` after connectivity is stable. Cached layers reduce repeated work. Inspect `docker ps --filter name=supabase` and the health of this project's containers; avoid changing unrelated containers on the host.
3. Use `npm run supabase:status` locally to populate `.env.local` from `.env.example`. Keep keys in the ignored file and do not paste private values into chat or commit them.
4. Run `npm run verify:connection`. Both Auth settings and the REST database endpoint must pass before connectivity is recorded as verified.
5. Apply Phase 2 migrations to a local development database and run the isolation, permissions, storage, concurrency, uniqueness, and idempotency tests. A running database container alone is insufficient evidence.
6. If local image downloads remain unreliable, create a dedicated hosted development project, explicitly link it, and review migration SQL before applying. Do not use a production project for destructive reset/test commands.

This note will be updated when a deferred check obtains a passing result; its history explains the initial symptoms without asserting an unverified fix.

## Supabase resolution evidence

The retry completed. Database, Auth, gateway, REST, and Storage are running for the `loop` project. Actual local connection values were written to ignored `.env.local` without printing keys. `npm run verify:connection` passed both Auth settings and REST. All six migrations applied; database lint reported no schema errors; generated types were checked in the typed app; all 10 database integration tests passed, including real Storage API permission tests. Local development fixtures were created. No hosted project was needed. The registry failure is retained above as a reproducible setup note if it recurs.

The browser issue remains unresolved and explicitly deferred by the user. No browser pass is claimed.

## Additional Phase 3 verification

All four production HTTP integration groups pass. These cover nine public routes, dynamic Supabase content updates, canonical metadata, published-only data even with administrator cookies, private invitation token validation, actual approved-image signing/optimization, anonymous admin redirects, and authenticated SSR admin rendering. Run `npm run build` then `npm run test:public`. This narrows the outstanding browser investigation to browser rendering/interaction and does not substitute for mobile screenshots, hydration, keyboard/lightbox, or countdown interaction checks.

## Phase 4 email setup — configuration required

`RESEND_API_KEY` and `RESEND_FROM_EMAIL` are not configured. The application has a real server-side Resend transport, not a fake success response. Invitation and RSVP email jobs are persisted in `notifications`; missing configuration records a failed delivery with a next-attempt timestamp. The saved RSVP remains committed. No real email delivery has been claimed or tested.

To resolve: verify a sender domain in Resend, create a scoped sending key, configure both variables in ignored `.env.local` (and later the deployment environment), set `NEXT_PUBLIC_APP_URL` to the reachable application origin, restart the application, and retry a controlled notification from guest administration. Review the job’s status/provider ID and receipt in the intended inbox. Never commit credentials. Follow the [Resend send-email reference](https://resend.com/docs/api-reference/emails/send-email).

Invitation jobs persist only a group ID, never the raw invitation URL/token. Each send/retry generates a new token in memory and invalidates earlier links. Use the latest successfully received invitation. A timeout after provider acceptance may produce a later replacement email; production operational review should account for that ambiguity. Delivery status currently means provider acceptance, not confirmed inbox delivery or webhook delivery tracking. Advanced delivery webhooks/retry scheduling belong to Phase 7.

Request limits are stored in PostgreSQL with HMAC-hashed keys. With proxy trust disabled (default), anonymous visitors share a conservative visitor bucket plus a per-token bucket. Enable `TRUST_PROXY_HEADERS=true` only when the deployment proxy overwrites the client-supplied forwarding header; otherwise an attacker could spoof IP values. Configure an optional nonempty `RATE_LIMIT_SECRET` for independent key rotation. Expired limiter-row cleanup still needs the Phase 7 operational worker.

Guest management currently loads up to 1000 invitation-group choices/RSVP summaries; the guest table itself is paginated and CSV export reads batches. Very large group directories need the searchable/paginated controls scheduled for Phase 6. CSV import is limited to 1000 rows/2 MiB; split larger imports, and use exported guest/group IDs to update existing rows. Export protects spreadsheet formula prefixes; review any added leading apostrophe when reimporting formula-like names.
