"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { getWorkspace } from "@/lib/workspace";
import { modules, moduleKey, parseFields } from "@/lib/admin/modules";
import type { ActionState } from "@/components/admin/action-form";
export async function contentAction(weddingId: string, module: string, _state: ActionState, form: FormData): Promise<ActionState> {
 try {
  const key = moduleKey(module); const config = modules[key]; const { client, role, wedding } = await getWorkspace(weddingId);
  if (!(config.roles as readonly string[]).includes(role)) throw new Error("You cannot edit this module.");
  const operation = z.enum(["save", "publish", "unpublish", "delete", "discard"]).parse(form.get("operation") ?? "save");
  const id = form.get("id") ? z.uuid().parse(form.get("id")) : crypto.randomUUID();
  const check = (result: { error: { message: string } | null }) => { if (result.error) throw new Error("Unable to save. Check linked records and field values."); };
  if (operation === "save") {
   const payload = parseFields(key, form);
   if ("image_path" in payload && payload.image_path) { const asset = await client.from("media_assets").select("id").eq("wedding_id", weddingId).eq("object_path", payload.image_path).maybeSingle(); if (asset.error || !asset.data) throw new Error("Choose an image from this wedding’s media library."); }
   if ("album_id" in payload) { const album = await client.from("gallery_albums").select("id").eq("wedding_id", weddingId).eq("id", payload.album_id).maybeSingle(); if (album.error || !album.data) throw new Error("Publish or save the album before adding photographs."); }
   check(await client.from("content_drafts").upsert({ wedding_id: weddingId, module: config.table, record_id: id, payload }, { onConflict: "wedding_id,module,record_id" }));
  } else if (operation === "publish") {
   const draft = await client.from("content_drafts").select("id").eq("wedding_id", weddingId).eq("module", config.table).eq("record_id", id).single();
   check(draft); check(await client.rpc("publish_content", { p_wedding_id: weddingId, p_draft_id: draft.data!.id }));
  } else if (operation === "discard") { check(await client.from("content_drafts").delete().eq("wedding_id", weddingId).eq("module", config.table).eq("record_id", id));
  } else if (operation === "unpublish") { check(await client.from(config.table).update({ is_published: false }).eq("wedding_id", weddingId).eq("id", id));
  } else { check(await client.from(config.table).delete().eq("wedding_id", weddingId).eq("id", id)); check(await client.from("content_drafts").delete().eq("wedding_id", weddingId).eq("module", config.table).eq("record_id", id)); }
  revalidatePath(`/admin/${weddingId}` , "layout"); revalidatePath(`/${wedding.slug}`, "layout");
  return { message: operation === "save" ? "Draft saved. Preview it before publishing." : "Content updated." };
 } catch (error) { unstable_rethrow(error); return { error: true, message: error instanceof z.ZodError ? error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ") : error instanceof Error ? error.message : "Unable to save content." }; }
}

export async function bulkContentAction(weddingId: string, module: string, _state: ActionState, form: FormData): Promise<ActionState> {
 try {
  const key=moduleKey(module);const config=modules[key];const {client,role,wedding}=await getWorkspace(weddingId);
  if (!(config.roles as readonly string[]).includes(role)) throw new Error("You cannot edit this module.");
  const ids=z.array(z.uuid()).min(1).max(50).parse(form.getAll("ids"));const operation=z.enum(["publish","hide"]).parse(form.get("operation"));
  if(operation==="publish"){
   const drafts=await client.from("content_drafts").select("id").eq("wedding_id",weddingId).eq("module",config.table).in("record_id",ids);
   if(drafts.error||drafts.data.length!==ids.length)throw new Error("Every selected record needs a saved draft before bulk publication.");
   const result=await client.rpc("publish_content_batch",{p_wedding_id:weddingId,p_drafts:drafts.data.map(d=>d.id)});if(result.error)throw new Error("No drafts were published. Check linked records and permissions.");
  }else{const result=await client.from(config.table).update({is_published:false}).eq("wedding_id",weddingId).in("id",ids);if(result.error)throw new Error("Unable to hide selected records.");}
  revalidatePath(`/admin/${weddingId}`,"layout");revalidatePath(`/${wedding.slug}`,"layout");return{message:"Selected records updated."};
 }catch(error){unstable_rethrow(error);return{error:true,message:error instanceof z.ZodError?"Choose up to 50 records.":error instanceof Error?error.message:"Unable to apply bulk action."};}
}
