"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { getWorkspace } from "@/lib/workspace";
import type { ActionState } from "@/components/admin/action-form";
export async function teamAction(id: string, _state: ActionState, form: FormData): Promise<ActionState> {
 try {
  const { client, role } = await getWorkspace(id); if (!["owner", "admin"].includes(role)) throw new Error("You cannot manage team permissions.");
  const operation = z.enum(["save", "delete"]).parse(form.get("operation") ?? "save"); const member = form.get("id") ? z.uuid().parse(form.get("id")) : null;
  const nextRole = z.enum(["owner", "admin", "coordinator", "viewer"]).parse(form.get("role") ?? "viewer");
  if (role === "admin" && !["coordinator", "viewer"].includes(nextRole)) throw new Error("Only an owner can grant elevated roles.");
  const result = operation === "delete" ? await client.from("wedding_members").delete().eq("wedding_id", id).eq("id", z.uuid().parse(member)).select("id") : member ? await client.from("wedding_members").update({ role: nextRole }).eq("wedding_id", id).eq("id", member).select("id") : await client.from("wedding_members").insert({ wedding_id: id, profile_id: z.uuid().parse(form.get("profile_id")), role: nextRole }).select("id");
  if (result.error || !result.data?.length) throw new Error("Unable to change membership. Keep an owner and check account ID and permissions.");
  revalidatePath(`/admin/${id}`, "layout"); return { message: "Team membership updated." };
 } catch (error) { unstable_rethrow(error); return { error: true, message: error instanceof z.ZodError ? "Enter a valid existing account ID and role." : error instanceof Error ? error.message : "Unable to manage team." }; }
}
