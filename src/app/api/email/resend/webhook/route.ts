import { z } from "zod";
import { readLimitedBody, privateJson } from "@/lib/http";
import { verifyEmailWebhook } from "@/lib/email/webhook";
import { createTrustedClient } from "@/lib/supabase/admin";
export async function POST(request: Request) {
 const secret = process.env.RESEND_WEBHOOK_SECRET; if (!secret) return privateJson({ error: "Email webhook is not configured." }, 503);
 let raw; try { raw = await readLimitedBody(request, 65536); } catch { return privateJson({ error: "Invalid body." }, 400); }
 if (!verifyEmailWebhook(raw, request.headers, secret)) return privateJson({ error: "Invalid signature." }, 401);
 const schema = z.object({ type: z.string().max(100), created_at: z.iso.datetime({ offset: true }), data: z.object({ email_id: z.string().min(1).max(200) }) });
 let event; try { event = schema.parse(JSON.parse(raw.toString("utf8"))); } catch { return privateJson({ error: "Invalid event." }, 400); }
 if (!["email.delivered", "email.bounced", "email.complained", "email.delivery_delayed", "email.failed", "email.suppressed"].includes(event.type)) return privateJson({ ignored: true });
 const result = await createTrustedClient().rpc("apply_email_event", { p_event_id: request.headers.get("svix-id")!, p_provider_id: event.data.email_id, p_event_type: event.type, p_occurred_at: event.created_at });
 if (result.error) return privateJson({ error: "Unable to record event. Retry later." }, 503);
 return privateJson({ recorded: result.data });
}
