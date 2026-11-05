import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getWedding } from "@/lib/wedding/data";
import { createTrustedClient } from "@/lib/supabase/admin";
import { readLimitedBody, sameOrigin, privateJson } from "@/lib/http";
import { amountMinor, initializeTransaction } from "@/lib/payments/paystack";
import { limitRequest, RateLimitError } from "@/lib/invitations/rate-limit";
const schema = z.object({ amount: z.string().max(20), email: z.email().max(320), name: z.string().trim().max(200).default(""), message: z.string().trim().max(4000).default("") }).strict();
export async function POST(request: Request, { params }: { params: Promise<{ weddingSlug: string }> }) {
  if (!sameOrigin(request)) return privateJson({ error: "Request origin is not permitted." }, 403);
  const wedding = await getWedding((await params).weddingSlug);
  if (!wedding.content.contributions_enabled) return privateJson({ error: "Monetary contributions are not enabled for this wedding." }, 403);
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return privateJson({ error: "Monetary contributions are temporarily unavailable." }, 503);
  try { await limitRequest("initialize-payment", wedding.id, 20, 60); } catch (error) { return privateJson({ error: error instanceof RateLimitError ? error.message : "Unable to verify this request." }, error instanceof RateLimitError ? 429 : 503); }
  let values; let amount: number;
  try { values = schema.parse(JSON.parse((await readLimitedBody(request, 32768)).toString("utf8"))); amount = amountMinor(values.amount); } catch { return privateJson({ error: "Check the amount and your email address." }, 400); }
  const reference = `loop-${randomUUID()}`; const client = createTrustedClient();
  const created = await client.from("contributions").insert({ wedding_id: wedding.id, reference, amount_minor: amount, currency: "NGN", contributor_name: values.name || null, email: values.email, message: values.message || null }).select("id").single();
  if (created.error) return privateJson({ error: "Unable to create a contribution." }, 500);
  try {
    const callback = new URL(`/${wedding.slug}/contribution`, process.env.NEXT_PUBLIC_APP_URL); callback.searchParams.set("reference", reference);
    const initialized = await initializeTransaction(secret, { reference, amount, email: values.email, currency: "NGN", callback_url: callback.toString() });
    return privateJson({ authorization_url: initialized.authorization_url, reference });
  } catch { await client.from("contributions").update({ status: "failed" }).eq("id", created.data.id); return privateJson({ error: "Unable to start checkout. Please try again." }, 502); }
}
