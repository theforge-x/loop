"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { getWorkspace } from "@/lib/workspace";
import { contentSchema, themeSchema } from "@/lib/wedding/content";
import type { ActionState } from "@/components/admin/action-form";
export async function websiteAction(id: string, _state: ActionState, form: FormData): Promise<ActionState> {
 try {
  const { client, role, wedding } = await getWorkspace(id); if (!["owner", "admin"].includes(role)) throw new Error("Only owners and administrators can edit the website.");
  const operation = z.enum(["save", "publish", "unpublish"]).parse(form.get("operation") ?? "save");
  let result;
  if (operation === "publish") result = await client.rpc("publish_website", { p_wedding_id: id });
  else if (operation === "unpublish") result = await client.from("weddings").update({ is_published: false }).eq("id", id);
  else {
   const identity = z.object({ title: z.string().trim().min(1).max(200), partner_one_name: z.string().trim().min(1).max(200), partner_two_name: z.string().trim().min(1).max(200), wedding_date: z.union([z.iso.datetime({ offset: true }), z.literal("")]), timezone: z.string().refine(v => { try { new Intl.DateTimeFormat("en", { timeZone: v }); return true; } catch { return false; } }, "Choose an IANA timezone") }).parse({ title: form.get("title"), partner_one_name: form.get("partner_one_name"), partner_two_name: form.get("partner_two_name"), wedding_date: form.get("wedding_date") ? new Date(`${form.get("wedding_date")}Z`).toISOString() : "", timezone: form.get("timezone") });
   const values: Record<string, unknown> = { identity, contributions_enabled: form.get("contributions_enabled") === "on", section_visibility: Object.fromEntries(["venue", "story", "events", "gallery", "rsvp", "wishlist"].map(s => [s, form.get(`section_${s}`) === "on"])) };
   for (const key of ["hero_image_path", "hero_caption", "welcome_heading", "welcome_text", "story_intro", "venue_name", "venue_address", "footer_text", "seo_description", "instagram_url"]) { const v = String(form.get(key) ?? "").trim(); if (v) values[key] = v; }
   const content = contentSchema.parse(values); const theme = themeSchema.parse(Object.fromEntries(["primary", "background", "foreground", "accent", "font", "button_style"].map(key => [key, form.get(key)])));
   if (content.hero_image_path) { const asset = await client.from("media_assets").select("id").eq("wedding_id", id).eq("object_path", content.hero_image_path).maybeSingle(); if (asset.error || !asset.data) throw new Error("Choose a hero image from this wedding’s media library."); }
   result = await client.from("site_settings").upsert({ wedding_id: id, is_published: false, content, theme }, { onConflict: "wedding_id,is_published" });
  }
  if (result.error) throw new Error("Unable to save website settings.");
  revalidatePath(`/admin/${id}`, "layout"); revalidatePath(`/${wedding.slug}`, "layout"); return { message: operation === "save" ? "Draft saved. Review the preview, then publish." : "Website publication updated." };
 } catch (error) { unstable_rethrow(error); return { error: true, message: error instanceof z.ZodError ? "Check required names, dates, colors and links." : error instanceof Error ? error.message : "Unable to save website." }; }
}
