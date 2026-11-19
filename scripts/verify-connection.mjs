import assert from "node:assert/strict";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
assert.ok(url && key, "Configure .env.local before verifying Supabase.");
const headers = { apikey: key };
if (!key.startsWith("sb_publishable_")) headers.Authorization = `Bearer ${key}`;
for (const path of ["/auth/v1/settings", "/rest/v1/"]) {
  const response = await fetch(new URL(path, url), { headers, signal: AbortSignal.timeout(10000) });
  assert.ok(response.ok, `Supabase ${path} returned ${response.status}`);
  assert.match(response.headers.get("content-type") ?? "", /json/);
  await response.json();
  console.log(`PASS Supabase ${path}`);
}
