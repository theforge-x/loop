import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { getWorkspace } from "@/lib/workspace";
import { contentSchema, themeSchema } from "@/lib/wedding/content";
import { WeddingHomeView } from "@/components/wedding/home-view";
export const metadata: Metadata = { title: "Private website preview", robots: { index: false, follow: false } };
export default async function PreviewPage({ params }: { params: Promise<{ weddingId: string }> }) {
 const { weddingId } = await params; const { client, wedding } = await getWorkspace(weddingId);
 const [settings, stories, events, albums, images, gifts, announcements, drafts, assets] = await Promise.all([
 client.from("site_settings").select("content,theme").eq("wedding_id", weddingId).eq("is_published", false).maybeSingle(),
 client.from("story_sections").select("*").eq("wedding_id", weddingId).order("sort_order").limit(100), client.from("events").select("*").eq("wedding_id", weddingId).order("starts_at").limit(100), client.from("gallery_albums").select("id,title,description").eq("wedding_id", weddingId).limit(100), client.from("gallery_images").select("*").eq("wedding_id", weddingId).order("sort_order").limit(100), client.from("wishlist_items").select("*").eq("wedding_id", weddingId).limit(100), client.from("announcements").select("id,title,content,publish_at").eq("wedding_id", weddingId).limit(100), client.from("content_drafts").select("*").eq("wedding_id", weddingId).limit(500), client.from("media_assets").select("object_path").eq("wedding_id", weddingId).limit(500)]);
 for (const result of [settings, stories, events, albums, images, gifts, announcements, drafts, assets]) if (result.error) throw new Error("Unable to load website preview.");
 function merge<T extends { id: string }>(module: string, rows: T[]): T[] { const combined = new Map(rows.map(r => [r.id,r])); for (const d of drafts.data!) if (d.module === module) combined.set(d.record_id, { ...combined.get(d.record_id), ...(d.payload as object), id: d.record_id } as T); return [...combined.values()]; }
 const signed = assets.data!.length ? await client.storage.from("wedding-media").createSignedUrls(assets.data!.map(a => a.object_path), 600) : { data: [] };
 const urls = Object.fromEntries((signed.data ?? []).flatMap(a => a.path && a.signedUrl ? [[a.path,a.signedUrl]] : []));
 const content = contentSchema.parse(settings.data?.content ?? {}); const theme = themeSchema.parse(settings.data?.theme ?? {});
 const preview = { ...wedding, ...content.identity, wedding_date: content.identity?.wedding_date || wedding.wedding_date, content, theme };
 const style = Object.fromEntries(Object.entries(theme).filter(([key]) => ["primary", "background", "foreground", "accent"].includes(key)).map(([key,value]) => [`--${key}`,value])) as CSSProperties;
 return <><p className="mb-6 rounded border p-4 text-sm">Private draft preview. Saved edits appear here before publication. Private events are excluded from the public homepage.</p><div style={style} className="overflow-hidden rounded border bg-background text-foreground"><WeddingHomeView wedding={preview} events={merge("events", events.data!).filter(e => !e.is_private)} stories={merge("story_sections", stories.data!)} gallery={{ albums: merge("gallery_albums", albums.data!), images: merge("gallery_images", images.data!) }} registry={{ items: gifts.data!.map(g => ({ ...g, remaining: 0 })), categories: [] }} announcements={merge("announcements", announcements.data!)} urls={urls} /></div></>;
}
