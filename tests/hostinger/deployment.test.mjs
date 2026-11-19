import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { preflight } from '../../scripts/hostinger/preflight.mjs';
import { packageSource } from '../../scripts/hostinger/package.mjs';
import { runNotifications } from '../../scripts/hostinger/notifications.mjs';

const valid = { NEXT_PUBLIC_APP_URL: 'https://loop.example.com', NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-test-key', SUPABASE_SERVICE_ROLE_KEY: 'private-test-key', CRON_SECRET: 'x'.repeat(32) };
test('Hostinger build rejects unsupported runtime and local or malformed production configuration', () => {
  assert.deepEqual(preflight(valid, '24.15.0'), []);
  assert.deepEqual(preflight({ ...valid, NEXT_PUBLIC_SUPABASE_ANON_KEY: '', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'public-test-key' }, '24.15.0'), []);
  assert.deepEqual(preflight(valid, '22.22.2'), []);
  for (const version of ['20.19.0', '22.22.1', '24.14.0', '26.0.0']) assert.ok(preflight(valid, version).length);
  for (const url of ['http://localhost:3000', 'https://user:pass@example.com', 'https://example.com/path', 'https://example.com?secret=x']) {
    assert.ok(preflight({ ...valid, NEXT_PUBLIC_APP_URL: url }, '24.15.0').length);
  }
  assert.ok(preflight({ ...valid, SUPABASE_SERVICE_ROLE_KEY: '', CRON_SECRET: 'short' }, '24.15.0').length >= 2);
});
test('upload archive includes current source and excludes private local files; refuses overwrite and symlinks', () => {
  const root = mkdtempSync(join(tmpdir(), 'loop-package-test-'));
  try {
    for (const dir of ['src', 'scripts/hostinger']) mkdirSync(join(root, dir), { recursive: true });
    for (const file of ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'next.config.ts', 'tsconfig.json', 'eslint.config.mjs', 'postcss.config.mjs', '.nvmrc', 'src/app.ts', 'scripts/hostinger/build.mjs']) writeFileSync(join(root, file), 'fixture');
    for (const file of ['.env', '.env.local', '.local-dev-accounts.json', '.local-release-readiness.json']) writeFileSync(join(root, file), 'SECRET');
    const archive = join(root, 'source.tar.gz');
    packageSource(root, archive);
    const listing = execFileSync('tar', ['-tzf', archive], { encoding: 'utf8' });
    assert.match(listing, /src\/app.ts/);
    assert.match(listing, /pnpm-lock.yaml/);
    assert.doesNotMatch(listing, /\.env|accounts|readiness/);
    const original = readFileSync(archive);
    assert.throws(() => packageSource(root, archive));
    assert.deepEqual(readFileSync(archive), original);
    symlinkSync(join(root, '.env'), join(root, 'src', 'secret'));
    assert.throws(() => packageSource(root, join(root, 'unsafe.tar.gz')), /symbolic links/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
test('scheduler authenticates, rejects redirects, bounds runtime and surfaces HTTP failure without body', async () => {
  const env = { HOSTINGER_APP_URL: 'https://loop.example.com', HOSTINGER_CRON_SECRET: 'x'.repeat(32) };
  let calls = 0;
  await runNotifications(env, async (url, options) => {
    calls++;
    assert.equal(String(url), 'https://loop.example.com/api/cron/notifications');
    assert.equal(options.headers.authorization, `Bearer ${env.HOSTINGER_CRON_SECRET}`);
    assert.equal(options.redirect, 'error');
    assert.ok(options.signal instanceof AbortSignal);
    return new Response('{}');
  });
  assert.equal(calls, 1);
  await assert.rejects(runNotifications({ ...env, HOSTINGER_APP_URL: 'http://example.com' }, () => assert.fail('must not request')));
  await assert.rejects(runNotifications({ ...env, HOSTINGER_CRON_SECRET: '' }, () => assert.fail('must not request')));
  await assert.rejects(runNotifications(env, async () => new Response('PRIVATE', { status: 503 })), /^Error: Notification worker returned HTTP 503\.$/);
});
