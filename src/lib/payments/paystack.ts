import { createHmac, timingSafeEqual } from "node:crypto";
import JSONbig from "json-bigint";
import { z } from "zod";
const lossless = JSONbig({ storeAsString: true, protoAction: "error", constructorAction: "error" });
export function parseProviderJson(text: string): unknown { return lossless.parse(text); }
export function amountMinor(value: string) {
  if (!/^(0|[1-9][0-9]{0,9})(\.[0-9]{1,2})?$/.test(value)) throw new Error("Enter an amount with at most two decimal places.");
  const [major, fraction = ""] = value.split("."); const amount = Number(major) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error("The amount must be greater than zero.");
  return amount;
}
function equalHex(expected: Buffer, hex: string) { return /^[0-9a-f]{128}$/.test(hex) && timingSafeEqual(expected, Buffer.from(hex, "hex")); }
export function verifyWebhookSignature(raw: Buffer, modernHeader: string | null, legacyHeader: string | null, secrets: { signing: string[]; legacy?: string }, now = Math.floor(Date.now() / 1000)) {
  // Once signing secrets are configured, never downgrade to the legacy header.
  if (secrets.signing.length || modernHeader) {
    if (!modernHeader || !secrets.signing.length) return false;
    let timestamp: number | null = null; const signatures: string[] = [];
    for (const part of modernHeader.split(",")) {
      const separator = part.indexOf("="); if (separator < 0) continue;
      const key = part.slice(0, separator).trim(); const value = part.slice(separator + 1).trim();
      if (key === "t") { if (timestamp !== null || !/^[0-9]+$/.test(value)) return false; timestamp = Number(value); }
      if (key === "v1") { const colon = value.indexOf(":"); if (colon > 0 && value.slice(0, colon).startsWith("whk_")) signatures.push(value.slice(colon + 1)); }
    }
    if (timestamp === null || !Number.isSafeInteger(timestamp) || Math.abs(now - timestamp) > 300) return false;
    return secrets.signing.some(secret => { const expected = createHmac("sha512", secret).update(`${timestamp}.`).update(raw).digest(); return signatures.some(signature => equalHex(expected, signature)); });
  }
  return Boolean(secrets.legacy && legacyHeader && equalHex(createHmac("sha512", secrets.legacy).update(raw).digest(), legacyHeader));
}
const idSchema = z.union([z.string().regex(/^[0-9]{1,20}$/), z.number().int().nonnegative().safe()]).transform(String).refine(value => BigInt(value) <= BigInt("18446744073709551615"));
const transactionSchema = z.object({ id: idSchema, status: z.string(), reference: z.string().min(8).max(200), amount: z.number().int().positive().safe(), currency: z.string().regex(/^[A-Z]{3}$/) });
export const chargeEventSchema = z.object({ event: z.literal("charge.success"), data: transactionSchema });
export type VerifiedTransaction = z.infer<typeof transactionSchema>;
export async function verifyTransaction(secret: string, reference: string, fetcher: typeof fetch = fetch) {
  const response = await fetcher(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, { headers: { Authorization: `Bearer ${secret}` }, cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error("Payment verification is unavailable.");
  return z.object({ status: z.literal(true), data: transactionSchema }).parse(parseProviderJson(await response.text())).data;
}
export function requirePaymentMatch(transaction: VerifiedTransaction, expected: { reference: string; amount_minor: number; currency: string }, signedTransactionId: string) {
  if (transaction.status !== "success" || transaction.reference !== expected.reference || transaction.amount !== expected.amount_minor || transaction.currency !== expected.currency || transaction.id !== signedTransactionId) throw new Error("Payment verification does not match the contribution.");
}
export async function initializeTransaction(secret: string, values: { reference: string; amount: number; email: string; currency: "NGN"; callback_url: string }, fetcher: typeof fetch = fetch) {
  const response = await fetcher("https://api.paystack.co/transaction/initialize", { method: "POST", headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" }, body: JSON.stringify({ ...values, amount: String(values.amount) }), signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error("Unable to initialize payment.");
  const result = z.object({ status: z.literal(true), data: z.object({ reference: z.string(), authorization_url: z.url(), access_code: z.string() }) }).parse(parseProviderJson(await response.text())).data;
  const url = new URL(result.authorization_url);
  if (result.reference !== values.reference || url.protocol !== "https:" || url.hostname !== "checkout.paystack.com") throw new Error("Unexpected checkout response.");
  return result;
}
