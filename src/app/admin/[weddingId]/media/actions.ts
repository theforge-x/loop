"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { requireGuestOperator } from "@/lib/workspace";
import type { ActionState } from "@/components/admin/action-form";
export async function mediaAction(weddingId: string, _state: ActionState, form: FormData): Promise<ActionState> {
 try {
  const { client, wedding } = await requireGuestOperator(weddingId); const id = z.uuid().parse(form.get("id")); const operation = z.enum(["publish","hide","delete"]).parse(form.get("operation"));
  const found = await client.from("media_assets").select("object_path").eq("wedding_id",weddingId).eq("id",id).single(); if (found.error) throw new Error("Image unavailable.");
  const path = found.data.object_path;
  if (operation === "delete") {
   const [stories,gifts,photos,settings,drafts] = await Promise.all([client.from("story_sections").select("id").eq("wedding_id",weddingId).eq("image_path",path).limit(1),client.from("wishlist_items").select("id").eq("wedding_id",weddingId).eq("image_path",path).limit(1),client.from("gallery_images").select("id").eq("wedding_id",weddingId).eq("image_path",path).limit(1),client.from("site_settings").select("id").eq("wedding_id",weddingId).contains("content",{hero_image_path:path}).limit(1),client.from("content_drafts").select("payload").eq("wedding_id",weddingId).limit(1000)]);
   if ([stories,gifts,photos,settings,drafts].some(r=>r.error)) throw new Error("Unable to verify image references.");
   if ([stories,gifts,photos,settings].some(r=>r.data!.length) || drafts.data!.length>=1000 || drafts.data!.some(d=>JSON.stringify(d.payload).includes(path))) throw new Error("Remove this image from website content, gifts, albums and drafts before deleting it.");
   const removed = await client.storage.from("wedding-media").remove([path]); if (removed.error) throw new Error("Unable to delete stored image.");
   const deleted = await client.from("media_assets").delete().eq("wedding_id",weddingId).eq("id",id); if (deleted.error) throw new Error("Stored image removed; unable to remove metadata. Retry deletion.");
  } else { const result = await client.from("media_assets").update({is_published:operation==="publish"}).eq("wedding_id",weddingId).eq("id",id); if (result.error) throw new Error("Unable to update image visibility."); }
  revalidatePath(`/admin/${weddingId}`,"layout"); revalidatePath(`/${wedding.slug}`,"layout"); return {message:"Media library updated. Existing signed URLs expire within one hour."};
 } catch (error) { unstable_rethrow(error);return {error:true,message:error instanceof Error?error.message:"Unable to update media."}; }
}
