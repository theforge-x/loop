import { after } from "next/server";
import { createTrustedClient } from "@/lib/supabase/admin";
import { limitRequest, RateLimitError } from "@/lib/invitations/rate-limit";
import { rsvpSchema } from "@/lib/invitations/validation";
import { deliverNotification } from "@/lib/email/outbox";
const privateHeaders = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex" };
function reply(body: object, status = 200) { return Response.json(body, { status, headers: privateHeaders }); }
async function readBody(request: Request) {
  const reader = request.body?.getReader(); if (!reader) throw new Error("Empty request");
  const parts: Uint8Array[] = []; let size = 0;
  try { while (true) { const next = await reader.read(); if (next.done) break; size += next.value.byteLength; if (size > 1048576) { await reader.cancel(); throw new Error("Request too large"); } parts.push(next.value); } }
  finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(parts).toString("utf8"));
}
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (token.length < 43 || token.length > 256) return reply({ error: "Invitation unavailable." }, 404);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin && origin !== new URL(process.env.NEXT_PUBLIC_APP_URL ?? request.url).origin) return reply({ error: "Request origin is not permitted." }, 403);
  try { await limitRequest("guest-rsvp", token, 10, 600); }
  catch (error) { return error instanceof RateLimitError ? Response.json({ error: error.message }, { status: 429, headers: { ...privateHeaders, "Retry-After": "600" } }) : reply({ error: "Unable to protect this request. Please try again." }, 503); }
  let raw: unknown; try { raw = await readBody(request); } catch { return reply({ error: "Invalid or oversized RSVP request." }, 400); }
  const parsed = rsvpSchema.safeParse(raw);
  if (!parsed.success) return reply({ error: "Check attendee names, event selections, and response details." }, 400);
  const values = parsed.data; const client = createTrustedClient();
  const saved = await client.rpc("submit_rsvp", { p_token: token, p_status: values.status, p_attendees: values.attendees, p_event_ids: values.event_ids, p_dietary: values.dietary, p_accessibility: values.accessibility, p_message: values.message });
  if (saved.error) {
    const errors: Record<string, string> = { "Guest allowance exceeded": "Your response exceeds the guest allowance on this invitation.", "Event unavailable": "One of the selected events is unavailable for your invitation.", "Declined RSVP cannot contain attendees or events": "A declined response cannot include attendees or events.", "Invitation unavailable": "Invitation unavailable." };
    const message = errors[saved.error.message];
    return reply({ error: message ?? "Unable to save this response. Check your invitation or contact the couple." }, saved.error.message === "Invitation unavailable" ? 404 : 400);
  }
  // Business state and the outbox commit together. Provider failures occur afterwards.
  after(async () => {
    const jobs = await client.from("notifications").select("id").eq("notification_type", "rsvp_confirmation").eq("status", "pending").contains("payload", { rsvp_id: saved.data }).order("created_at", { ascending: false }).limit(5);
    if (jobs.error) { console.error("Unable to schedule RSVP confirmation delivery."); return; }
    for (const job of jobs.data) await deliverNotification(job.id);
  });
  return reply({ saved: true, rsvp_id: saved.data });
}
