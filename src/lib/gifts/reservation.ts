import "server-only";
import { createHash } from "node:crypto";
import { notFound } from "next/navigation";
import { createTrustedClient } from "@/lib/supabase/admin";
export async function getReservation(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) notFound();
  const client = createTrustedClient();
  const result = await client.from("gift_reservations").select("id,wedding_id,wishlist_item_id,quantity,status,expires_at").eq("cancellation_token_hash", createHash("sha256").update(token).digest("hex")).maybeSingle();
  if (result.error) throw new Error("Unable to load gift reservation.");
  if (!result.data) notFound();
  const [item, wedding] = await Promise.all([client.from("wishlist_items").select("title").eq("wedding_id", result.data.wedding_id).eq("id", result.data.wishlist_item_id).single(), client.from("weddings").select("slug,partner_one_name,partner_two_name").eq("id", result.data.wedding_id).single()]);
  if (item.error || wedding.error) throw new Error("Unable to load gift details.");
  return { ...result.data, item: item.data, wedding: wedding.data };
}
