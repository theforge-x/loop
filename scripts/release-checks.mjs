// Pure configuration checks and read-only deployed checks. Never invoke workers/providers.
export const manualGates = [
  ['accounts-auth', 'Confirm production project/account identities, Auth redirects, sender and cross-device confirmation.'],
  ['backup-restore', 'Verify recoverable database and Storage backups, retention, restore rehearsal and recovery targets.'],
  ['migrations-isolation', 'Review/apply migration plan; record hosted migration versions, lint and two-tenant RLS/Storage evidence.'],
  ['proxy-secrets', 'Confirm environment scope, secret provenance and proxy header replacement before trusting headers.'],
  ['paystack-sandbox', 'Complete real isolated Paystack test checkout and signed webhook verification.'],
  ['paystack-live', 'Complete operator-approved live verification before enabling contributions.'],
  ['email', 'Verify Auth and Resend inbox receipt, signed delivery events and suppression behavior.'],
  ['hosting-scheduler', 'Confirm deployed commit, remote CI, cron plan/duration, one scheduler and authenticated execution.'],
  ['domain-monitoring', 'Confirm DNS/HTTPS/redirects and test uptime, worker and webhook alert delivery.'],
  ['acceptance', 'Complete controlled hosted workflows, two-tenant checks, physical HTTPS camera and mobile performance.'],
  ['launch', 'Record operator approval, evidence references, rollback commit and payment/notification reconciliation plan.'],
].map(([id, instruction]) => ({ id, status: 'OPEN', instruction }));

export function hostedOrigin(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !u.username && !u.password &&
      u.pathname === '/' && !u.search && !u.hash &&
      !['localhost', '127.0.0.1', '[::1]'].includes(u.hostname) && !u.hostname.endsWith('.localhost');
  } catch { return false; }
}

export function configurationChecks(env, mode = 'live') {
  const checks = [];
  const check = (name, passes) => checks.push({ name, passes: Boolean(passes) });
  check('Production HTTPS application origin', hostedOrigin(env.NEXT_PUBLIC_APP_URL));
  check('Hosted HTTPS Supabase origin', hostedOrigin(env.NEXT_PUBLIC_SUPABASE_URL));
  for (const key of ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'RESEND_WEBHOOK_SECRET', 'PAYSTACK_SECRET_KEY', 'NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY']) check(key, env[key]?.trim());
  check('Private request-limit secret (32+ characters)', env.RATE_LIMIT_SECRET?.trim().length >= 32);
  check('Authenticated worker secret (32+ characters)', env.CRON_SECRET?.trim().length >= 32);
  check(`Paystack public/private key modes match (${mode})`,
    env.PAYSTACK_SECRET_KEY?.startsWith(`sk_${mode}_`) && env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY?.startsWith(`pk_${mode}_`));
  check('Verified production email sender format', /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(env.RESEND_FROM_EMAIL ?? ''));
  check('Proxy trust explicitly true or false', ['true', 'false'].includes(env.TRUST_PROXY_HEADERS));
  let timezoneValid = false;
  try { if (env.NEXT_PUBLIC_DEFAULT_TIMEZONE) { new Intl.DateTimeFormat('en', { timeZone: env.NEXT_PUBLIC_DEFAULT_TIMEZONE }); timezoneValid = true; } } catch {}
  check('Default timezone is valid', timezoneValid);
  check('No private credentials in public variable names', !Object.keys(env).some(key => key.startsWith('NEXT_PUBLIC_') && /(SERVICE_ROLE|SECRET|RESEND_API|CRON)/.test(key)));
  return checks;
}

export async function deployedChecks(origin, fetcher = fetch) {
  if (!hostedOrigin(origin)) return [{ name: 'Deployed HTTPS origin required', passes: false }];
  const checks = [];
  for (const [path, status, contentType] of [
    ['/', 200, 'text/html'], ['/sign-in', 200, 'text/html'], ['/sign-up', 200, 'text/html'],
    ['/robots.txt', 200, 'text/plain'], ['/sitemap.xml', 200, 'xml'], ['/admin', 307, null],
  ]) {
    try {
      const response = await fetcher(new URL(path, origin), { redirect: 'manual', signal: AbortSignal.timeout(10000) });
      checks.push({ name: `GET ${path}: expected status and content type`, passes: response.status === status && (!contentType || (response.headers.get('content-type') ?? '').includes(contentType)) });
      if (path === '/') {
        checks.push({ name: 'Public security headers', passes: response.headers.get('x-content-type-options') === 'nosniff' && response.headers.get('x-frame-options') === 'DENY' && (response.headers.get('content-security-policy') ?? '').includes("frame-ancestors 'none'") });
      }
      if (path === '/admin') {
        let protectedRedirect = false;
        try { const target = new URL(response.headers.get('location'), origin); protectedRedirect = target.origin === new URL(origin).origin && target.pathname === '/sign-in'; } catch {}
        checks.push({ name: 'Anonymous admin redirects to same-origin sign-in', passes: protectedRedirect });
      }
      await response.body?.cancel();
    } catch {
      // Do not record URLs, response bodies or exception details that may contain secrets.
      checks.push({ name: `GET ${path}: reachable within timeout`, passes: false });
    }
  }
  return checks;
}
