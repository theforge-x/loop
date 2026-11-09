import type { MetadataRoute } from "next";
import { createPublicClient } from "@/lib/supabase/public";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
 const client = createPublicClient(); const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
 const entries: MetadataRoute.Sitemap = [{ url: new URL("/", origin).toString() }];
 // Stay below the sitemap protocol's 50,000 URL limit. Paginate instead of silently accepting PostgREST's row cap.
 for (let offset = 0; offset < 5000; offset += 1000) {
  const result = await client.from("weddings").select("slug,updated_at").eq("is_published", true).order("id").range(offset,offset+999);
  if (result.error) throw new Error("Unable to generate wedding sitemap.");
  for (const wedding of result.data) for (const path of ["", "/story", "/events", "/rsvp", "/wishlist", "/gallery", "/faq", "/travel", "/guestbook"]) entries.push({ url: new URL(`/${wedding.slug}${path}`, origin).toString(), lastModified: wedding.updated_at });
  if (result.data.length < 1000) return entries;
 }
 throw new Error("Split the wedding sitemap before exceeding 5000 published weddings.");
}
