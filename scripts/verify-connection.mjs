import assert from "node:assert/strict";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
assert.ok(url && key, "Configure .env.local before verifying Supabase.");
for (const path of ["/auth/v1/settings", "/rest/v1/"]) {
  const response = await fetch(new URL(path, url), { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(10000) });
  assert.ok(response.ok, `Supabase ${path} returned ${response.status}`);
  assert.match(response.headers.get("content-type") ?? "", /json/);
  await response.json();
  console.log(`PASS Supabase ${path}`);
}
