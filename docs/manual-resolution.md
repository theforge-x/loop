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

## Phase 4 acceptance evidence and remaining manual checks

All six dedicated workflow groups pass. Tests prove expired/invalid invitation rejection at the HTTP endpoint, server-enforced allowances/event eligibility, persisted per-token throttling, duplicate RSVP uniqueness, atomic CSV rollback, member-only CSV export, read-only viewer controls, SQL token/delivery-field protection, revocation ownership, queue deduplication, and a saved RSVP surviving a real missing-configuration delivery failure. Provider transport success/rejection is tested with controlled fetch responses; no actual email was sent. Migration 008 prevents already-sent deduplicated jobs from regressing group analytics to queued, and migration 009 restricts token/delivery mutation to privileged routines.

Still verify manually in a working browser: guest/group create/edit/delete action feedback, QR scanning against the generated URL, link revocation in an existing tab, clipboard behavior, adding/removing attendees, keyboard/mobile form controls, and CSV file upload feedback. Backend and HTTP checks do not substitute for those UI checks. Live Resend receipt and advanced scheduled retry/lease recovery remain unverified or assigned to Phase 7. The Node workflow runner currently emits a module-format inference warning for imported TypeScript helpers; the six tests still pass, and application lint/typecheck/build pass.

## Phase 5 payment verification — required external configuration

Phase 5 code and local checks are implemented, but actual Paystack verification remains **unverified**. `PAYSTACK_SECRET_KEY` is empty. No checkout or provider verification was faked in production. Without configuration, contribution initialization returns a service-unavailable response and creates no contribution row. Cash contributions also require the couple’s published `content.contributions_enabled` setting to be true. Guest physical gift reservations remain available independently.

### What local checks prove

- Four controlled payment tests verify exact minor units, timestamped signatures/rotation/replay windows, legacy compatibility without downgrade, raw-body integrity, exact unsigned 64-bit transaction IDs, failed/mismatched payments, amount/currency/reference/ID matching, and checkout URL validation. Provider fetch responses in these tests are controlled fixtures.
- The expanded real HTTP workflow suite passes nine groups, including gift/category CRUD, public filtering/role checks, eight concurrent requests for one gift yielding one reservation, private cancellation, fulfilled-gift cancellation rejection, and an unconfigured payment endpoint creating no fake transaction. A forged `status=success` callback query still shows the database’s pending state.
- Ten database tests and four public HTTP groups still pass. Database lint, strict TypeScript, lint and production build pass.
- A temporary CLI connection timeout during type generation left the previous type file intact. The database was healthy, a retry regenerated the actual schema types, and the final build passed. One HTTP run accidentally targeted the previous build; its new-route 404 results were discarded, and the full suite was rerun successfully against the completed build.

### Configure a controlled sandbox verification

1. Create/configure a Paystack test-mode integration. Set **test** `PAYSTACK_SECRET_KEY` in ignored `.env.local`. Keep the key out of Git/chat. Configure a webhook signing secret as described by the current [Paystack webhook documentation](https://paystack.com/docs/payments/webhooks/). Set `PAYSTACK_WEBHOOK_SECRET` to the complete `whsec_` value. `PAYSTACK_WEBHOOK_PREVIOUS_SECRET` is optional during an intentional rotation overlap. The API secret is still needed for transaction verification.
2. The application supports timestamped `Paystack-Signature` headers, checks the timestamp within 300 seconds, validates every candidate `v1` signature against configured current/previous signing secrets with constant-time comparisons, and never falls back to the legacy header when a modern signing secret is configured. Legacy `x-paystack-signature` verification is available only for integrations that have no configured modern signing secret and no modern header. Keep the server clock synchronized.
3. Expose the development application through a controlled HTTPS endpoint/tunnel and set `NEXT_PUBLIC_APP_URL` to that origin. Configure Paystack’s **test-mode** webhook to `<origin>/api/payments/paystack/webhook`. A localhost URL cannot receive a remote provider webhook. Restart development, or rebuild/restart production after changing public environment variables; Next.js public variables are fixed at build time in a production build.
4. Optionally set `PAYSTACK_TEST_EMAIL` to a controlled testing address. Start the application, then run `npm run verify:paystack`. The verifier refuses non-test API keys and non-local Supabase fixture hosts. It creates a separate local wedding fixture, enables its contribution option, initializes an actual sandbox checkout through the application, and prints the checkout URL. It stores only local verification references in ignored `.local-paystack-verification.json`. It does not collect card details or mark a contribution successful itself.
5. Complete a test payment using Paystack’s sandbox instructions. The verifier waits up to ten minutes for the actual webhook to commit a successful contribution, independently re-verifies the provider transaction, matches amount/currency/reference/ID, and checks exactly one logical charge event. No passing result is claimed until this executes successfully.
6. In Paystack’s test dashboard, resend that event and confirm no second credit/contribution appears. Also test declined/abandoned checkout, invalid signatures, webhook retries and any chosen signing-secret rotation. The database and controlled tests cover those rules; the real provider run confirms deployment/configuration.

The application records a logical event key `charge.success:<exact transaction id>` for payment replay protection, because repeated delivery of the same charge must remain harmless. Raw provider payloads/card authorization objects are not persisted. A callback only reads database state. Only the trusted server’s independently verified path calls `apply_verified_payment`. The success response is sent after verification and database persistence; upstream verification failures return a retryable non-success response.

### Remaining manual UI checks

Verify gift/category action forms, image selection/publication, self-updating availability after navigation/refresh, private cancellation links, fulfilment/release, the contribution opt-in, provider-hosted checkout navigation and receipt display in a supported mobile/desktop browser. The image selector uses this wedding’s media library; the complete upload/CMS experience belongs to Phase 6. Signed approved-image URLs expire after one hour, and image caching must be considered when retracting previously shared assets during the production review. Advanced automatic abandoned-reservation release and retry scheduling remain operational follow-ups.

**Gate:** Phase 6 has not started. Phase 5 remains awaiting the actual configured-provider verification rather than being described as production-ready.

## Continuation authorization and verification — 2026-11-09

The user now explicitly permits continuing when a phase check requires manual intervention, provided the check is flagged. `npm run verify:paystack` was rerun and rejected missing Paystack TEST credentials. Actual sandbox checkout/webhook verification remains OPEN; no provider success is claimed. Resend sender/account setup likewise remains OPEN.

Local Supabase is running; all existing database/public/invitation regression suites pass. The previously blocked focused desktop Playwright check now passes using the installed browser without application workarounds. Full mobile/desktop QA and new workflow interaction checks are being rerun; historical browser failures above are retained as diagnostics, not current proof of failure.

## Phase 7 manual gates

- Resend: configure RESEND_API_KEY, verified RESEND_FROM_EMAIL and RESEND_WEBHOOK_SECRET. Register `/api/email/resend/webhook` for delivered, bounced, complained, delivery_delayed, failed and suppressed events. Send only a deliberately selected test invitation; inspect actual inbox receipt, provider ID and delivery event. Provider acceptance alone is not delivery. Signature and persisted event replay checks pass with controlled signed events. See [Resend verification](https://resend.com/docs/webhooks/verify-webhooks-requests) and [Svix protocol](https://docs.svix.com/receiving/verifying-payloads/how-manual).
- Worker: configure a random CRON_SECRET of at least 32 characters and an authenticated scheduler calling GET `/api/cron/notifications`. The local acceptance test proves authentication, leases, retries, missing-provider failures and suppression with real database state. Deployment scheduling is not activated locally. Jobs stop after eight attempts; fix the cause and inspect exhausted jobs. Invitation retries still rotate the invitation link; receipt ambiguity on provider timeouts is retained from Phase 4.
- Camera: test `/admin/[weddingId]/check-in` on the actual HTTPS mobile device, grant camera access, scan an issued QR, confirm eligible attendees, then retry and revoke. Browser BarcodeDetector support varies; authenticated manual paste/search is available. Secure lookup, expiry/revocation, tenant/role restrictions, concurrent unique check-in and seating capacity all pass automated integration tests.
- Browser: desktop/mobile automation now runs, and authentication/error-page checks execute. This host intermittently stalls at screenshot capture or link clicks despite successful HTML assertions; do not report those runs as passing. A supported CI browser environment remains the resolution path if diagnostics cannot stabilize this host.
- Local CLI: implicit Supabase CLI database connections began timing out after the session restart. Direct psql works; `supabase db lint --db-url 'postgresql://postgres:postgres@127.0.0.1:54322/postgres?sslmode=disable'` passed with no schema errors (local development credentials only). No data reset was used. Migrations 013–014 were applied with psql single-transaction and matching migration-history entries.
