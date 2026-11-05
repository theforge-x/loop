import { z } from "zod";
import { after } from "next/server";
import { getWedding } from "@/lib/wedding/data";
import { createTrustedClient } from "@/lib/supabase/admin";
import { limitRequest, RateLimitError } from "@/lib/invitations/rate-limit";
import { readLimitedBody, sameOrigin, privateJson } from "@/lib/http";
import { deliverNotification } from "@/lib/email/outbox";
const schema = z.object({ quantity: z.number().int().min(1).max(100000), name: z.string().trim().max(200).default(""), email: z.union([z.email().max(320), z.literal("")]).default(""), message: z.string().trim().max(4000).default(""), reveal_identity: z.boolean().default(false) }).strict();
export async function POST(request: Request, { params }: { params: Promise<{ weddingSlug: string; itemId: string }> }) {
  if (!sameOrigin(request)) return privateJson({ error: "Request origin is not permitted." }, 403);
  const { weddingSlug, itemId } = await params;
  if (!z.uuid().safeParse(itemId).success) return privateJson({ error: "Gift unavailable." }, 404);
  const wedding = await getWedding(weddingSlug);
  try { await limitRequest("reserve-gift", itemId, 20, 60); } catch (error) { return privateJson({ error: error instanceof RateLimitError ? error.message : "Unable to verify this request." }, error instanceof RateLimitError ? 429 : 503); }
  let parsed; try { parsed = schema.safeParse(JSON.parse((await readLimitedBody(request, 32768)).toString("utf8"))); } catch { return privateJson({ error: "Invalid reservation details." }, 400); }
  if (!parsed.success) return privateJson({ error: "Check your reservation details and quantity." }, 400);
  const input = parsed.data; const client = createTrustedClient();
  const result = await client.rpc("reserve_gift", { p_wedding_id: wedding.id, p_item_id: itemId, p_quantity: input.quantity, p_name: input.name || undefined, p_email: input.email || undefined, p_message: input.message || undefined, p_reveal_identity: input.reveal_identity });
  if (result.error) return privateJson({ error: result.error.message === "Insufficient quantity" ? "This quantity is no longer available. Please refresh the wishlist." : "This gift is unavailable." }, 409);
  const reservation = z.object({ id: z.uuid(), cancellation_token: z.string().regex(/^[a-f0-9]{64}$/) }).parse(result.data);
  if (input.email) {
    const job = await client.from("notifications").insert({ wedding_id: wedding.id, notification_type: "gift_reservation", recipient_email: input.email, payload: { reservation_id: reservation.id }, deduplication_key: `gift:${reservation.id}` }).select("id").single();
    if (!job.error) after(() => deliverNotification(job.data.id));
    else console.error("Unable to queue gift reservation confirmation.");
  }
  return privateJson({ saved: true, reservation_id: reservation.id, cancellation_url: new URL(`/gift-reservations/${reservation.cancellation_token}`, process.env.NEXT_PUBLIC_APP_URL).toString() });
}
