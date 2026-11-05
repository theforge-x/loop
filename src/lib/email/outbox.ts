import "server-only";
import { createTrustedClient } from "@/lib/supabase/admin";
import { escapeHtml, sendEmail } from "./transport";
export async function deliverNotification(id: string) {
  const client = createTrustedClient();
  const found = await client.from("notifications").select("*").eq("id", id).single();
  if (found.error || found.data.status === "sent" || found.data.status === "suppressed") return;
  const job = found.data;
  if (job.status === "processing") return;
  const claimed = await client.from("notifications").update({ status: "processing", attempts: job.attempts + 1 }).eq("id", id).eq("status", job.status).eq("attempts", job.attempts).select("id").maybeSingle();
  if (claimed.error || !claimed.data) return;
  const payload = job.payload && typeof job.payload === "object" && !Array.isArray(job.payload) ? job.payload : {};
  try {
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
    } else if (job.notification_type === "rsvp_confirmation") {
      subject = `Your RSVP — ${names}`; text = `Your RSVP has been saved for ${names}. Response: ${String(payload.status ?? "received")}. Use your personal invitation to review or update your response.`;
    } else throw new Error("Unsupported email notification type.");
    const providerId = await sendEmail(key, { from, to: job.recipient_email, subject, text, html: `<html><body style="background:#faf7f1;color:#303b32;font-family:Georgia,serif;padding:32px"><h1>${escapeHtml(names)}</h1><p style="line-height:1.8;white-space:pre-line">${escapeHtml(text)}</p></body></html>` }, `${job.id}:${job.attempts + 1}`);
    const saved = await client.from("notifications").update({ status: "sent", provider_message_id: providerId, sent_at: new Date().toISOString(), last_error: null }).eq("id", id);
    if (saved.error) throw new Error("Unable to record email delivery.");
    if (job.notification_type === "invitation" && typeof payload.group_id === "string") await client.from("invitation_groups").update({ delivery_status: "sent" }).eq("wedding_id", job.wedding_id).eq("id", payload.group_id);
  } catch (error) {
    await client.from("notifications").update({ status: "failed", last_error: error instanceof Error ? error.message : "Email delivery failed.", next_attempt_at: new Date(Date.now() + Math.min(86400, 60 * 2 ** Math.min(job.attempts, 10)) * 1000).toISOString() }).eq("id", id);
    if (job.notification_type === "invitation" && typeof payload.group_id === "string") await client.from("invitation_groups").update({ delivery_status: "failed" }).eq("wedding_id", job.wedding_id).eq("id", payload.group_id);
  }
}
