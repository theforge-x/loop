"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { requireGuestOperator } from "@/lib/workspace";
import { amountMinor } from "@/lib/payments/paystack";
import { safeExternalUrl } from "@/lib/wedding/content";
import type { ActionState } from "@/components/admin/action-form";
function failure(error: unknown): ActionState { unstable_rethrow(error); return { error: true, message: error instanceof z.ZodError ? "Check the gift fields and quantity." : error instanceof Error ? error.message : "Unable to save the registry." }; }
function check(result: { error: { code?: string; message: string } | null }) { if (result.error) throw new Error(result.error.code === "P0001" ? result.error.message : result.error.code === "23503" ? "This record has retained reservations or linked gifts. Deactivate it instead." : "Unable to save this change."); }
export async function saveCategory(id: string, _state: ActionState, form: FormData): Promise<ActionState> {
 try { const { client }=await requireGuestOperator(id);const title=z.string().trim().min(1).max(200).parse(form.get("title"));const values={title,description:z.string().max(4000).parse(form.get("description")??""),is_published:form.get("is_published")==="on"};const category=form.get("id");if(category)check(await client.from("wishlist_categories").update(values).eq("wedding_id",id).eq("id",z.uuid().parse(category)));else check(await client.from("wishlist_categories").insert({wedding_id:id,...values}));revalidatePath(`/admin/${id}/registry`);return{message:"Gift category saved."};}catch(error){return failure(error);}
}
export async function saveItem(id: string, _state: ActionState, form: FormData): Promise<ActionState> {
 try {const {client}=await requireGuestOperator(id);const title=z.string().trim().min(1).max(200).parse(form.get("title"));const category=z.union([z.uuid(),z.literal("")]).parse(form.get("category_id")??"");const quantity=z.coerce.number().int().min(1).max(100000).parse(form.get("quantity_required"));const price=z.string().parse(form.get("price")??"");const currency=z.string().regex(/^[A-Z]{3}$/).parse(form.get("currency")??"NGN");const external=z.string().max(2000).parse(form.get("external_url")??"");if(external&&!safeExternalUrl(external))throw new Error("Use an HTTPS link for the gift.");const image=z.string().parse(form.get("image_path")??"");if(image){const asset=await client.from("media_assets").select("id").eq("wedding_id",id).eq("object_path",image).maybeSingle();if(asset.error||!asset.data)throw new Error("Choose an image from this wedding’s media library.");}const values={title,description:z.string().max(4000).parse(form.get("description")??""),category_id:category||null,quantity_required:quantity,price_minor:price?amountMinor(price):null,currency,external_url:external||null,image_path:image||null,is_active:form.get("is_active")==="on",is_published:form.get("is_published")==="on"};const item=form.get("id");if(item)check(await client.from("wishlist_items").update(values).eq("wedding_id",id).eq("id",z.uuid().parse(item)));else check(await client.from("wishlist_items").insert({wedding_id:id,...values}));revalidatePath(`/admin/${id}/registry`);return{message:"Gift saved."};}catch(error){return failure(error);}
}
export async function removeRegistryRecord(id: string, _state: ActionState, form: FormData): Promise<ActionState> {
 try{const {client}=await requireGuestOperator(id);const record=z.uuid().parse(form.get("id"));const table=z.enum(["wishlist_items","wishlist_categories"]).parse(form.get("table"));check(await client.from(table).delete().eq("wedding_id",id).eq("id",record));revalidatePath(`/admin/${id}/registry`);return{message:"Registry record removed."};}catch(error){return failure(error);}
}
export async function reservationStatus(id: string, _state: ActionState, form: FormData): Promise<ActionState> {
 try{const {client}=await requireGuestOperator(id);const status=z.enum(["fulfilled","cancelled"]).parse(form.get("status"));check(await client.rpc("set_reservation_status",{p_wedding_id:id,p_reservation_id:z.uuid().parse(form.get("id")),p_status:status}));revalidatePath(`/admin/${id}/registry`);return{message:status==="fulfilled"?"Gift marked fulfilled.":"Reservation released."};}catch(error){return failure(error);}
}
