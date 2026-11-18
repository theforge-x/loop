export async function runNotifications(env = process.env, request = fetch) {
  const origin = new URL(env.HOSTINGER_APP_URL);
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) {
    throw new Error('HOSTINGER_APP_URL must be a canonical HTTPS origin.');
  }
  const secret = env.HOSTINGER_CRON_SECRET;
  if (!secret || secret.length < 32) throw new Error('HOSTINGER_CRON_SECRET must have at least 32 characters.');
  const response = await request(new URL('/api/cron/notifications', origin), {
    method: 'GET', headers: { authorization: `Bearer ${secret}` },
    redirect: 'error', signal: AbortSignal.timeout(300_000),
  });
  // Never log response bodies: worker/provider details are private.
  if (!response.ok) throw new Error(`Notification worker returned HTTP ${response.status}.`);
  await response.body?.cancel();
}
