"use server";
import { z } from "zod";
import QRCode from "qrcode";
import { unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireGuestOperator } from "@/lib/workspace";
import { limitRequest } from "@/lib/invitations/rate-limit";
import { parseGuestCsv } from "@/lib/invitations/csv";
import { deliverNotification } from "@/lib/email/outbox";
import type { ActionState } from "@/components/admin/action-form";
const email = z.union([z.email().max(320), z.literal("")]);
const groupSchema = z.object({ name: z.string().trim().min(1).max(200), contact_email: email, guest_allowance: z.coerce.number().int().min(1).max(1000) });
const guestSchema = z.object({ name: z.string().trim().min(1).max(200), email, invitation_group_id: z.uuid() });
function checked<T>(result: { data: T; error: { code?: string; message: string } | null }): T {
  if (result.error) {
    if (result.error.code === "23503") throw new Error("This record has linked attendance history and cannot be removed or moved.");
    if (result.error.code === "23505") throw new Error("That invitation group label is already in use.");
    if (result.error.code === "P0001") throw new Error(result.error.message);
    throw new Error("Unable to save this change. Please try again.");
  }
  return result.data;
}
function failed(error: unknown): ActionState { unstable_rethrow(error); return { error: true, message: error instanceof z.ZodError ? "Check the required fields, email addresses, and guest allowance." : error instanceof Error ? error.message : "Unable to save this change." }; }
function refresh(id: string) { revalidatePath(`/admin/${id}/guests`); }
export async function saveGroup(id: string, _state: ActionState, form: FormData): Promise<ActionState> {
  try {
    const { client, user } = await requireGuestOperator(id);
    await limitRequest("manage-guests", user.id, 100, 60);
    const values = groupSchema.parse(Object.fromEntries(form));
    const groupId = form.get("id");
    const payload = { ...values, contact_email: values.contact_email || null };
    if (groupId) checked(await client.from("invitation_groups").update(payload).eq("wedding_id", id).eq("id", z.uuid().parse(groupId)));
    else checked(await client.from("invitation_groups").insert({ wedding_id: id, ...payload }));
    refresh(id); return { message: "Invitation group saved." };
  } catch (error) { return failed(error); }
}
export async function removeGroup(id: string, _state: ActionState, form: FormData): Promise<ActionState> {
  try { const { client } = await requireGuestOperator(id); checked(await client.from("invitation_groups").delete().eq("wedding_id", id).eq("id", z.uuid().parse(form.get("id")))); refresh(id); return { message: "Invitation group and its unsaved guests removed." }; }
  catch (error) { return failed(error); }
}
export async function saveGuest(id: string, _state: ActionState, form: FormData): Promise<ActionState> {
  try {
    const { client, user } = await requireGuestOperator(id); await limitRequest("manage-guests", user.id, 100, 60);
    const values = guestSchema.parse(Object.fromEntries(form));
    const guestId = form.get("id"); const payload = { ...values, email: values.email || null };
    if (guestId) checked(await client.from("guests").update(payload).eq("wedding_id", id).eq("id", z.uuid().parse(guestId)));
    else checked(await client.from("guests").insert({ wedding_id: id, ...payload }));
    refresh(id); return { message: "Guest saved." };
  } catch (error) { return failed(error); }
}
export async function removeGuest(id: string, _state: ActionState, form: FormData): Promise<ActionState> {
  try { const { client } = await requireGuestOperator(id); checked(await client.from("guests").delete().eq("wedding_id", id).eq("id", z.uuid().parse(form.get("id")))); refresh(id); return { message: "Guest removed." }; }
  catch (error) { return failed(error); }
}
export async function generateInvitation(id: string, _state: ActionState, form: FormData): Promise<ActionState> {
  try {
    const { client, user } = await requireGuestOperator(id); await limitRequest("issue-invitation", user.id, 30, 60);
    const groupId = z.uuid().parse(form.get("id")); const days = z.coerce.number().int().min(1).max(365).parse(form.get("days"));
    const token = checked(await client.rpc("issue_invitation", { p_wedding_id: id, p_group_id: groupId, p_expires_at: new Date(Date.now() + days * 86400000).toISOString() }));
    if (!token) throw new Error("Unable to generate invitation.");
    const invitationUrl = new URL(`/invitation/${token}`, process.env.NEXT_PUBLIC_APP_URL).toString();
    const qrDataUrl = await QRCode.toDataURL(invitationUrl, { width: 400, margin: 2, errorCorrectionLevel: "M" });
    refresh(id); return { message: "New invitation generated. Earlier links for this group are revoked. Copy this link now; it is not stored in readable form.", invitationUrl, qrDataUrl };
  } catch (error) { return failed(error); }
}
export async function sendInvitation(id: string, _state: ActionState, form: FormData): Promise<ActionState> {
  try { const { client, user } = await requireGuestOperator(id); await limitRequest("send-invitation", user.id, 30, 60); const job = checked(await client.rpc("queue_invitation", { p_wedding_id: id, p_group_id: z.uuid().parse(form.get("id")) })); if (!job) throw new Error("Unable to queue invitation."); after(() => deliverNotification(job)); refresh(id); return { message: "Invitation queued. Delivery status is recorded below. Sending issues a new personal link." }; }
  catch (error) { return failed(error); }
}
export async function importCsv(id: string, _state: ActionState, form: FormData): Promise<ActionState> {
  try {
    const { client, user } = await requireGuestOperator(id); await limitRequest("guest-import", user.id, 10, 600);
    const file = form.get("file"); if (!(file instanceof File) || file.size > 2097152) throw new Error("Choose a CSV file of at most 2 MiB.");
    const rows = parseGuestCsv(await file.text());
    const result = checked(await client.rpc("import_guests", { p_wedding_id: id, p_rows: rows }));
    const summary = z.object({ added: z.number(), updated: z.number(), groups_created: z.number() }).parse(result);
    refresh(id); return { message: `${summary.added} guests added, ${summary.updated} updated, and ${summary.groups_created} invitation groups created.` };
  } catch (error) { return failed(error); }
}
export async function retryNotification(id: string, _state: ActionState, form: FormData): Promise<ActionState> {
  try {
    const { client, user } = await requireGuestOperator(id); await limitRequest("retry-email", user.id, 30, 60);
    // RLS verifies tenant ownership before the trusted worker receives the record ID.
    const job = checked(await client.from("notifications").select("id,status").eq("wedding_id", id).eq("id", z.uuid().parse(form.get("id"))).single());
    if (!job || !["pending", "failed"].includes(job.status)) throw new Error("This email is not awaiting retry.");
    after(() => deliverNotification(job.id)); refresh(id); return { message: "Delivery retry scheduled." };
  } catch (error) { return failed(error); }
}
