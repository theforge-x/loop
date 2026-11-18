// Build-time public values are embedded by Next.js and must match the final host.
export function preflight(env = process.env, version = process.versions.node) {
  const problems = [];
  const [major, minor, patch] = version.split('.').map(Number);
  if (!((major === 22 && (minor > 22 || (minor === 22 && patch >= 2))) ||
        (major === 24 && (minor > 15 || (minor === 15 && patch >= 0))))) {
    problems.push('Select Hostinger Node 24 (>=24.15.0) or 22 (>=22.22.2), matching package.json.');
  }
  for (const key of ['NEXT_PUBLIC_APP_URL', 'NEXT_PUBLIC_SUPABASE_URL']) {
    try {
      const url = new URL(env[key]);
      if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash ||
          ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error();
    } catch { problems.push(`${key} must be a hosted HTTPS origin without credentials, path, query or fragment.`); }
  }
  for (const key of ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) {
    if (!env[key]?.trim()) problems.push(`${key} is required.`);
  }
  if (!env.CRON_SECRET || env.CRON_SECRET.length < 32) problems.push('CRON_SECRET must have at least 32 characters.');
  return problems;
}
