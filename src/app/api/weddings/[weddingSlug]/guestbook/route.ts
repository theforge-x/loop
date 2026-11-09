import { z } from "zod";
import { readLimitedBody, privateJson, sameOrigin } from "@/lib/http";
import { createTrustedClient } from "@/lib/supabase/admin";
import { limitRequest, RateLimitError } from "@/lib/invitations/rate-limit";
export async function POST(request: Request, { params }: { params: Promise<{ weddingSlug: string }> }) {
 if (!sameOrigin(request)) return privateJson({ error: "Request origin is not permitted." }, 403);
 const { weddingSlug } = await params; if (!/^[a-z0-9-]{3,80}$/.test(weddingSlug)) return privateJson({ error: "Wedding unavailable." }, 404);
 try { await limitRequest("guestbook", weddingSlug, 5, 600, true); } catch (error) { return privateJson({ error: error instanceof RateLimitError ? error.message : "Unable to protect this request." }, error instanceof RateLimitError ? 429 : 503); }
 let value; try { value = z.object({ name: z.string().trim().min(1).max(200), message: z.string().trim().min(1).max(4000).refine(v => (v.match(/https?:\/\//gi) ?? []).length <= 2, "Too many links"), website: z.string().max(1000).optional() }).parse(JSON.parse((await readLimitedBody(request, 16384)).toString("utf8"))); } catch { return privateJson({ error: "Enter your name and a message of up to 4000 characters." }, 400); }
 if (value.website) return privateJson({ saved: true });
 const client = createTrustedClient(); const wedding = await client.from("weddings").select("id").eq("slug", weddingSlug).eq("is_published", true).maybeSingle();
 if (wedding.error) return privateJson({ error: "Wedding unavailable." }, 503); if (!wedding.data) return privateJson({ error: "Wedding unavailable." }, 404);
 const result = await client.from("guestbook_messages").insert({ wedding_id: wedding.data.id, name: value.name, message: value.message, moderation_status: "pending" });
 return result.error ? privateJson({ error: "Unable to save your message." }, 503) : privateJson({ saved: true });
}
