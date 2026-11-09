import "server-only";
import { createTrustedClient } from "@/lib/supabase/admin";
import { sendEmail } from "./transport";
import { emailTemplate } from "./templates";
export async function deliverNotification(id: string, force = false) {
  const client = createTrustedClient();
  const claimed = await client.rpc("claim_notification", { p_id: id, p_force: force });
  if (claimed.error) throw new Error("Unable to claim email delivery.");
  const job = claimed.data?.[0]; if (!job) return;
  const lease = job.lease_token!;
  const payload = job.payload && typeof job.payload === "object" && !Array.isArray(job.payload) ? job.payload : {};
  try {
    const suppression = await client.from("email_suppressions").select("email").eq("wedding_id", job.wedding_id).eq("email", job.recipient_email.toLowerCase()).maybeSingle();
    if (suppression.error) throw new Error("Unable to check email suppression.");
    if (suppression.data) { await client.from("notifications").update({ status: "suppressed", delivery_status: "suppressed", lease_token: null, lease_expires_at: null, last_error: "Recipient suppressed after a delivery failure or complaint." }).eq("id", id).eq("lease_token", lease); return; }
    const key = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    if (!key || !from) throw new Error("Email delivery is not configured.");
    const result = await client.from("weddings").select("partner_one_name,partner_two_name").eq("id", job.wedding_id).single();
    if (result.error) throw new Error("Wedding unavailable for email.");
    const names = `${result.data.partner_one_name} & ${result.data.partner_two_name}`;
    let subject: string; let text: string;
    if (job.notification_type === "invitation" && typeof payload.group_id === "string") {
      // Persist only the group ID in the job. Each retry issues a new token in memory,
      // invalidating prior links; raw invitation tokens never enter database payloads.
      const token = await client.rpc("issue_invitation", { p_wedding_id: job.wedding_id, p_group_id: payload.group_id, p_expires_at: new Date(Date.now() + 30 * 86400000).toISOString() });
      if (token.error) throw new Error("Unable to issue invitation.");
      const url = new URL(`/invitation/${token.data}`, process.env.NEXT_PUBLIC_APP_URL).toString();
      subject = `You’re invited — ${names}`; text = `${names} would love you to join their celebration. Your personal invitation: ${url}`;
    } else if (job.notification_type === "gift_reservation" && typeof payload.reservation_id === "string") {
      const reservation = await client.from("gift_reservations").select("quantity,wishlist_item_id").eq("wedding_id", job.wedding_id).eq("id", payload.reservation_id).single();
      if (reservation.error) throw new Error("Gift reservation unavailable.");
      const item = await client.from("wishlist_items").select("title").eq("wedding_id", job.wedding_id).eq("id", reservation.data.wishlist_item_id).single();
      if (item.error) throw new Error("Gift unavailable.");
      subject = `Gift reservation — ${names}`; text = `Your gift reservation for ${names} is saved: ${reservation.data.quantity} × ${item.data.title}. This is a physical gift reservation, separate from any payment. Keep the private management link shown when you reserved the gift.`;
    } else if (job.notification_type === "announcement" && typeof payload.announcement_id === "string") {
      const announcement = await client.from("announcements").select("title,content,publish_at").eq("wedding_id", job.wedding_id).eq("id", payload.announcement_id).eq("is_published", true).single();
      if (announcement.error || new Date(announcement.data.publish_at).getTime() > Date.now()) throw new Error("Announcement is unavailable or not yet published.");
      subject = `${announcement.data.title} — ${names}`; text = announcement.data.content;
    } else if (job.notification_type === "event_reminder" && typeof payload.event_id === "string") {
      const event = await client.from("events").select("title,starts_at,venue_name,address,is_private").eq("wedding_id", job.wedding_id).eq("id", payload.event_id).eq("is_published", true).single();
      if (event.error) throw new Error("Event is unavailable.");
      if (event.data.is_private) {
        if (typeof payload.group_id !== "string") throw new Error("Reminder recipient eligibility is unavailable.");
        const eligible = await client.from("invitation_group_events").select("id").eq("wedding_id",job.wedding_id).eq("event_id",payload.event_id).eq("invitation_group_id",payload.group_id).maybeSingle();
        if (eligible.error || !eligible.data) { await client.from("notifications").update({ status: "suppressed", last_error: "Recipient is no longer eligible for the private event.", lease_token: null, lease_expires_at: null }).eq("id",id).eq("lease_token",lease); return; }
      }
      if (new Date(event.data.starts_at).getTime() < Date.now()) { await client.from("notifications").update({ status: "suppressed", last_error: "Event has already started.", lease_token: null, lease_expires_at: null }).eq("id",id).eq("lease_token",lease); return; }
      subject = `A reminder — ${event.data.title}`; text = `${names} look forward to seeing you at ${event.data.title}.\n${event.data.starts_at}\n${event.data.venue_name ?? ""}\n${event.data.address ?? ""}`;
    } else if (job.notification_type === "rsvp_confirmation") {
      subject = `Your RSVP — ${names}`; text = `Your RSVP has been saved for ${names}. Response: ${String(payload.status ?? "received")}. Use your personal invitation to review or update your response.`;
    } else throw new Error("Unsupported email notification type.");
    const providerId = await sendEmail(key, { from, to: job.recipient_email, subject, text, html: emailTemplate(names, text) }, `${job.id}:${job.attempts}`);
    const saved = await client.from("notifications").update({ status: "sent", provider_message_id: providerId, sent_at: new Date().toISOString(), last_error: null, lease_token: null, lease_expires_at: null }).eq("id", id).eq("lease_token", lease).select("id").maybeSingle();
    if (saved.error) throw new Error("Unable to record email delivery.");
    if (!saved.data) return;
    if (job.notification_type === "invitation" && typeof payload.group_id === "string") await client.from("invitation_groups").update({ delivery_status: "sent" }).eq("wedding_id", job.wedding_id).eq("id", payload.group_id);
  } catch (error) {
    const failed = await client.from("notifications").update({ status: "failed", last_error: error instanceof Error ? error.message : "Email delivery failed.", next_attempt_at: new Date(Date.now() + Math.min(86400, 60 * 2 ** Math.min(job.attempts - 1, 10)) * 1000).toISOString(), lease_token: null, lease_expires_at: null }).eq("id", id).eq("lease_token", lease).select("id").maybeSingle();
    if (failed.data && job.notification_type === "invitation" && typeof payload.group_id === "string") await client.from("invitation_groups").update({ delivery_status: "failed" }).eq("wedding_id", job.wedding_id).eq("id", payload.group_id);
  }
}
