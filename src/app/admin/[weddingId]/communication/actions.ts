"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { requireGuestOperator } from "@/lib/workspace";
import type { ActionState } from "@/components/admin/action-form";
export async function queueCommunication(id: string, _state: ActionState, form: FormData): Promise<ActionState> {
 try {
 const { client } = await requireGuestOperator(id); const kind = z.enum(["announcement", "event_reminder"]).parse(form.get("kind")); const groups = z.array(z.uuid()).min(1).max(1000).parse(form.getAll("groups"));
 const result = await client.rpc("queue_communication", { p_wedding_id: id, p_kind: kind, p_record_id: z.uuid().parse(form.get("record_id")), p_groups: groups });
 if (result.error) throw new Error("Unable to queue. Publish the record, check event eligibility and each selected group’s email."); revalidatePath(`/admin/${id}/communication`); return { message: `${result.data} new email jobs queued. The scheduled worker sends due jobs.` };
 } catch (error) { unstable_rethrow(error); return { error: true, message: error instanceof z.ZodError ? "Choose a record and at least one recipient group." : error instanceof Error ? error.message : "Unable to queue communication." }; }
}
