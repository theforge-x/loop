import { createTrustedClient } from "@/lib/supabase/admin";
import { limitRequest, RateLimitError } from "@/lib/invitations/rate-limit";
import { sameOrigin, privateJson } from "@/lib/http";
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!sameOrigin(request)) return privateJson({ error: "Request origin is not permitted." }, 403);
  const { token } = await params;
  if (!/^[a-f0-9]{64}$/.test(token)) return privateJson({ error: "Reservation unavailable." }, 404);
  try { await limitRequest("cancel-gift", token, 10, 600); } catch (error) { return privateJson({ error: error instanceof RateLimitError ? error.message : "Unable to verify this request." }, error instanceof RateLimitError ? 429 : 503); }
  const result = await createTrustedClient().rpc("cancel_gift_reservation", { p_token: token });
  if (result.error) return privateJson({ error: result.error.message === "Fulfilled reservations cannot be cancelled" ? "This gift has already been fulfilled. Please contact the couple." : "Reservation unavailable." }, 409);
  return privateJson({ cancelled: true });
}
