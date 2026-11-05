import "server-only";
import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { headers } from "next/headers";
import { createTrustedClient } from "@/lib/supabase/admin";
export class RateLimitError extends Error {}
export async function limitRequest(scope: string, credential: string, limit = 10, seconds = 600) {
  const secret = process.env.RATE_LIMIT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Request protection is not configured.");
  const requestHeaders = await headers();
  // Ignore spoofable proxy headers by default. Enable only behind a trusted overwriting proxy.
  const candidate = process.env.TRUST_PROXY_HEADERS === "true" ? requestHeaders.get("x-forwarded-for")?.split(",")[0].trim() : null;
  const visitor = candidate && isIP(candidate) ? candidate : "shared-untrusted-network";
  const client = createTrustedClient();
  for (const [identity, maximum, window] of [[`visitor:${visitor}`, 500, 60], [`credential:${credential}`, limit, seconds]] as const) {
    const key = createHmac("sha256", secret).update(`${scope}:${identity}`).digest("hex");
    const result = await client.rpc("consume_rate_limit", { p_key_hash: key, p_limit: maximum, p_window_seconds: window });
    if (result.error) throw new Error("Unable to verify request limits.");
    if (!result.data) throw new RateLimitError("Too many requests. Please try again shortly.");
  }
}
