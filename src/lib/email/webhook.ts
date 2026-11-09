import { createHmac, timingSafeEqual } from "node:crypto";
// Resend uses the Svix protocol: id.timestamp.raw-body, SHA-256, base64 key/signature.
export function verifyEmailWebhook(raw: Uint8Array, headers: Headers, secret: string, now = Date.now()) {
 const id = headers.get("svix-id"); const timestamp = headers.get("svix-timestamp"); const signature = headers.get("svix-signature");
 if (!id || id.length > 200 || !timestamp || !/^\d{1,12}$/.test(timestamp) || !signature || signature.length > 4096 || !/^whsec_[A-Za-z0-9+/=]+$/.test(secret)) return false;
 if (Math.abs(now / 1000 - Number(timestamp)) > 300) return false;
 const key = Buffer.from(secret.slice(6), "base64"); if (key.length < 16) return false;
 const expected = createHmac("sha256", key).update(`${id}.${timestamp}.`).update(raw).digest();
 return signature.split(" ").some(value => { const [version, encoded] = value.split(","); if (version !== "v1" || !encoded || !/^[A-Za-z0-9+/=]+$/.test(encoded)) return false; const actual = Buffer.from(encoded, "base64"); return actual.length === expected.length && timingSafeEqual(actual, expected); });
}
