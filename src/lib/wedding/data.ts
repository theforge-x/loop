import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createPublicClient } from "@/lib/supabase/public";
import { contentSchema, themeSchema } from "./content";
function data<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error || result.data === null) throw new Error("Unable to load wedding content.", { cause: result.error });
  return result.data;
}
export const getWedding = cache(async (slug: string) => {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 80) notFound();
  const client = createPublicClient();
  const result = await client.from("weddings").select("*").eq("slug", slug).eq("is_published", true).maybeSingle();
  if (result.error) throw new Error("Unable to load wedding.", { cause: result.error });
  if (!result.data) notFound();
  const wedding = result.data;
  const settings = await client.from("site_settings").select("content,theme").eq("wedding_id", wedding.id).eq("is_published", true).maybeSingle();
  if (settings.error) throw new Error("Unable to load wedding settings.", { cause: settings.error });
  return { ...wedding, content: contentSchema.catch({}).parse(settings.data?.content ?? {}), theme: themeSchema.catch({}).parse(settings.data?.theme ?? {}) };
});
export type Wedding = Awaited<ReturnType<typeof getWedding>>;
export const getEvents = cache(async (id: string) => data(await createPublicClient().from("events").select("*").eq("wedding_id", id).eq("is_published", true).eq("is_private", false).order("starts_at").limit(50)));
export const getStory = cache(async (id: string) => data(await createPublicClient().from("story_sections").select("*").eq("wedding_id", id).eq("is_published", true).order("sort_order").limit(50)));
export const getFaqs = cache(async (id: string) => data(await createPublicClient().from("faqs").select("*").eq("wedding_id", id).eq("is_published", true).order("sort_order").limit(100)));
export const getTravel = cache(async (id: string) => data(await createPublicClient().from("travel_information").select("*").eq("wedding_id", id).eq("is_published", true).order("sort_order").limit(50)));
export const getMessages = cache(async (id: string) => data(await createPublicClient().from("guestbook_messages").select("id,name,message,created_at").eq("wedding_id", id).eq("moderation_status", "approved").order("created_at", { ascending: false }).limit(50)));
export const getAnnouncements = cache(async (id: string) => data(await createPublicClient().from("announcements").select("id,title,content,publish_at").eq("wedding_id", id).eq("is_published", true).lte("publish_at", new Date().toISOString()).order("publish_at", { ascending: false }).limit(10)));
export const getRegistry = cache(async (id: string) => {
  const client = createPublicClient();
  const [items, categories, availability] = await Promise.all([
    client.from("wishlist_items").select("*").eq("wedding_id", id).eq("is_published", true).eq("is_active", true).order("sort_order").limit(100),
    client.from("wishlist_categories").select("id,title").eq("wedding_id", id).eq("is_published", true).order("sort_order").limit(50),
    client.rpc("gift_availability", { p_wedding_id: id }),
  ]);
  const quantities = data(availability);
  return { items: data(items).map(item => ({ ...item, remaining: quantities.find(row => row.item_id === item.id)?.quantity_remaining ?? 0 })), categories: data(categories) };
});
export const getGallery = cache(async (id: string) => {
  const client = createPublicClient();
  const [albums, images] = await Promise.all([
    client.from("gallery_albums").select("id,title,description").eq("wedding_id", id).eq("is_published", true).order("sort_order").limit(30),
    client.from("gallery_images").select("*").eq("wedding_id", id).eq("is_published", true).order("sort_order").limit(100),
  ]);
  return { albums: data(albums), images: data(images) };
});
export const getMediaUrls = cache(async (id: string, paths: string[]) => {
  const requested = [...new Set(paths.filter(path => path.startsWith(`${id}/`) && !path.split("/").includes("..")))];
  if (!requested.length) return {} as Record<string, string>;
  const client = createPublicClient();
  const assets = data(await client.from("media_assets").select("object_path").eq("wedding_id", id).eq("is_published", true).in("object_path", requested));
  if (!assets.length) return {} as Record<string, string>;
  const signed = data(await client.storage.from("wedding-media").createSignedUrls(assets.map(asset => asset.object_path), 3600));
  const urls: Record<string, string> = {};
  for (const asset of signed) { if (asset.path && asset.signedUrl && !asset.error) urls[asset.path] = asset.signedUrl; }
  return urls;
});
export async function weddingMetadata(slug: string, path = "", title?: string): Promise<Metadata> {
  const wedding = await getWedding(slug);
  const names = `${wedding.partner_one_name} & ${wedding.partner_two_name}`;
  const pageTitle = title ? `${title} — ${names}` : names;
  const description = wedding.content.seo_description ?? `Celebrate with ${names}. Wedding details, our story, and everything you need to join us.`;
  return { title: { absolute: pageTitle }, description, alternates: { canonical: `/${wedding.slug}${path}` }, openGraph: { title: pageTitle, description, type: "website", url: `/${wedding.slug}${path}` } };
}
