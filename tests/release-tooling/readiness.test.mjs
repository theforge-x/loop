import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { configurationChecks, deployedChecks, hostedOrigin } from '../../scripts/release-checks.mjs';

const env = { NEXT_PUBLIC_APP_URL: 'https://loop.example.com', NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public', SUPABASE_SERVICE_ROLE_KEY: 'private-marker-never-log', RESEND_API_KEY: 'private-resend-marker', RESEND_FROM_EMAIL: 'invites@example.com', RESEND_WEBHOOK_SECRET: 'private-webhook-marker', RATE_LIMIT_SECRET: 'a'.repeat(32), CRON_SECRET: 'b'.repeat(32), PAYSTACK_SECRET_KEY: 'sk_live_private-marker', NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: 'pk_live_public', TRUST_PROXY_HEADERS: 'false', NEXT_PUBLIC_DEFAULT_TIMEZONE: 'Africa/Lagos' };
test('configuration rejects incomplete settings, mixed modes, invalid origins and public secrets', () => {
  assert.ok(configurationChecks(env).every(c => c.passes));
  assert.ok(configurationChecks({ ...env, NEXT_PUBLIC_SUPABASE_ANON_KEY: '', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'public' }).every(c => c.passes));
  assert.ok(configurationChecks({ ...env, NEXT_PUBLIC_SUPABASE_ANON_KEY: ' ' }).some(c => !c.passes));
  for (const value of ['http://localhost', 'https://localhost', 'https://[::1]', 'https://host/path', 'https://user:password@host', 'https://host?secret=value']) assert.equal(hostedOrigin(value), false);
  for (const patch of [{ NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: 'pk_test_public' }, { NEXT_PUBLIC_CRON_SECRET: 'secret' }, { NEXT_PUBLIC_DEFAULT_TIMEZONE: 'invalid' }, { TRUST_PROXY_HEADERS: '' }, { RATE_LIMIT_SECRET: ' '.repeat(32) }]) assert.ok(configurationChecks({ ...env, ...patch }).some(c => !c.passes));
  assert.ok(configurationChecks({ ...env, PAYSTACK_SECRET_KEY: 'sk_test_private', NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: 'pk_test_public' }, 'test').every(c => c.passes));
  assert.ok(configurationChecks({}).some(c => !c.passes));
});
test('smoke requests carry no credentials, follow no redirects and never invoke a worker', async () => {
  const paths = [];
  const checks = await deployedChecks(env.NEXT_PUBLIC_APP_URL, async (url, options) => {
    paths.push(url.pathname);
    assert.equal(options.redirect, 'manual');
    assert.equal(options.headers, undefined);
    const headers = { 'content-type': url.pathname.endsWith('.xml') ? 'application/xml' : url.pathname.endsWith('.txt') ? 'text/plain' : 'text/html', 'x-content-type-options': 'nosniff', 'x-frame-options': 'DENY', 'content-security-policy': "frame-ancestors 'none'", location: '/sign-in' };
    return new Response('', { status: url.pathname === '/admin' ? 307 : 200, headers });
  });
  assert.ok(checks.every(c => c.passes));
  assert.equal(paths.length, 6);
  assert.ok(paths.every(path => !path.startsWith('/api/')));
  const failures = await deployedChecks(env.NEXT_PUBLIC_APP_URL, async () => { throw new Error('private marker'); });
  assert.ok(failures.every(c => !c.passes));
  assert.ok(!JSON.stringify(failures).includes('private marker'));
  let called = false;
  await deployedChecks('http://localhost', async () => { called = true; });
  assert.equal(called, false);
  const redirects = await deployedChecks(env.NEXT_PUBLIC_APP_URL, async () => new Response('', { status: 307, headers: { location: 'https://other.example/sign-in' } }));
  assert.equal(redirects.find(c => c.name.startsWith('Anonymous admin')).passes, false);
});
test('CLI creates private evidence, preserves open gates, never logs values or overwrites evidence', () => {
  const report = join(mkdtempSync(join(tmpdir(), 'loop-release-')), 'report.json');
  const run = args => spawnSync(process.execPath, ['scripts/verify-release.mjs', ...args], { env, encoding: 'utf8' });
  const result = run(['--report', report]);
  assert.equal(result.status, 0, result.stderr);
  const contents = readFileSync(report, 'utf8');
  const evidence = JSON.parse(contents);
  assert.equal(evidence.automatedChecksPassed, true);
  assert.equal(evidence.productionReady, false);
  assert.ok(evidence.manualGates.every(g => g.status === 'OPEN'));
  assert.equal(statSync(report).mode & 0o777, 0o600);
  for (const secret of [env.SUPABASE_SERVICE_ROLE_KEY, env.PAYSTACK_SECRET_KEY, env.RESEND_API_KEY]) assert.ok(!(contents + result.stdout + result.stderr).includes(secret));
  assert.equal(run(['--report', report]).status, 1);
  assert.equal(readFileSync(report, 'utf8'), contents);
  assert.equal(run(['--mode', 'invalid']).status, 2);
});
