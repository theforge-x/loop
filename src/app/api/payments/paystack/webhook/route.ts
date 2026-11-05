import { createTrustedClient } from "@/lib/supabase/admin";
import { readLimitedBody, privateJson } from "@/lib/http";
import { verifyWebhookSignature, parseProviderJson, chargeEventSchema, verifyTransaction, requirePaymentMatch } from "@/lib/payments/paystack";
export async function POST(request: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const signing = [process.env.PAYSTACK_WEBHOOK_SECRET, process.env.PAYSTACK_WEBHOOK_PREVIOUS_SECRET].filter((value): value is string => Boolean(value));
  if (!secret) return privateJson({ error: "Payment verification is not configured." }, 503);
  let raw: Buffer; try { raw = await readLimitedBody(request); } catch { return privateJson({ error: "Invalid webhook body." }, 400); }
  if (!verifyWebhookSignature(raw, request.headers.get("paystack-signature"), request.headers.get("x-paystack-signature"), { signing, legacy: secret })) return privateJson({ error: "Invalid webhook signature." }, 401);
  let event; try { const decoded = parseProviderJson(raw.toString("utf8")); if (typeof decoded === "object" && decoded && "event" in decoded && decoded.event !== "charge.success") return privateJson({ received: true }); event = chargeEventSchema.parse(decoded); } catch { return privateJson({ error: "Invalid webhook event." }, 400); }
  const client = createTrustedClient();
  const contribution = await client.from("contributions").select("id,reference,amount_minor,currency").eq("reference", event.data.reference).maybeSingle();
  if (contribution.error) return privateJson({ error: "Unable to load payment state." }, 503);
  if (!contribution.data) return privateJson({ received: true });
  try {
    const verified = await verifyTransaction(secret, event.data.reference);
    requirePaymentMatch(verified, contribution.data, event.data.id);
    const applied = await client.rpc("apply_verified_payment", { p_event_id: `charge.success:${event.data.id}`, p_reference: verified.reference, p_amount_minor: verified.amount, p_currency: verified.currency, p_transaction_id: verified.id });
    if (applied.error) return privateJson({ error: "Unable to record verified payment." }, 503);
    return privateJson({ received: true });
  } catch { return privateJson({ error: "Provider transaction verification failed." }, 503); }
}
