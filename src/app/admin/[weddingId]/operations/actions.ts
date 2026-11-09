"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { requireGuestOperator } from "@/lib/workspace";
import type { ActionState } from "@/components/admin/action-form";
export async function operationAction(weddingId: string, _state: ActionState, form: FormData): Promise<ActionState> {
 try {
  const { client } = await requireGuestOperator(weddingId); const operation = z.enum(["table", "delete_table", "assign", "unassign", "checkin", "moderate", "delete_message", "rsvp"]).parse(form.get("operation"));
  const uuid = (key: string) => z.uuid().parse(form.get(key)); let result;
  if (operation === "table") { const values = { name: z.string().trim().min(1).max(200).parse(form.get("name")), capacity: z.coerce.number().int().min(1).max(1000).parse(form.get("capacity")) }; result = form.get("id") ? await client.from("seating_tables").update(values).eq("wedding_id", weddingId).eq("id", uuid("id")) : await client.from("seating_tables").insert({ wedding_id: weddingId, ...values }); }
  else if (operation === "delete_table") result = await client.from("seating_tables").delete().eq("wedding_id", weddingId).eq("id", uuid("id"));
  else if (operation === "assign") result = await client.rpc("assign_seat", { p_wedding_id: weddingId, p_table_id: uuid("table_id"), p_attendee_id: uuid("attendee_id") });
  else if (operation === "unassign") result = await client.rpc("unassign_seat", { p_wedding_id: weddingId, p_attendee_id: uuid("attendee_id") });
  else if (operation === "checkin") result = await client.rpc("check_in_attendee", { p_wedding_id: weddingId, p_event_id: uuid("event_id"), p_attendee_id: uuid("attendee_id") });
  else if (operation === "delete_message") result = await client.from("guestbook_messages").delete().eq("wedding_id", weddingId).eq("id", uuid("id"));
  else if (operation === "moderate") result = await client.from("guestbook_messages").update({ moderation_status: z.enum(["approved", "rejected", "pending"]).parse(form.get("status")), moderated_at: new Date().toISOString(), moderated_by: (await client.auth.getUser()).data.user!.id }).eq("wedding_id", weddingId).eq("id", uuid("id"));
  else { const names = z.string().max(20000).parse(form.get("names")).split("\n").map(s => s.trim()).filter(Boolean); const events = form.getAll("events").map(e => z.uuid().parse(e)); result = await client.rpc("record_rsvp", { p_wedding_id: weddingId, p_group_id: uuid("group_id"), p_status: z.enum(["attending", "declined"]).parse(form.get("status")), p_attendees: names.map(name => ({ name, type: "guest" })), p_event_ids: events }); }
  if (result.error) throw new Error(result.error.code === "P0001" ? result.error.message : "Unable to save. Check permissions, capacity and linked records.");
  revalidatePath(`/admin/${weddingId}`, "layout"); return { message: "Change saved." };
 } catch (error) { unstable_rethrow(error); return { error: true, message: error instanceof z.ZodError ? "Check the required fields." : error instanceof Error ? error.message : "Unable to save." }; }
}
