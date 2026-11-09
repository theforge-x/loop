import { z } from "zod";
import { getWorkspace } from "@/lib/workspace";
import { readLimitedBody, privateJson, sameOrigin } from "@/lib/http";
import { imageMime } from "@/lib/media/validation";
import { limitRequest } from "@/lib/invitations/rate-limit";
export async function POST(request: Request, { params }: { params: Promise<{ weddingId: string }> }) {
 if (!sameOrigin(request)) return privateJson({ error: "Request origin is not permitted." }, 403);
 const { weddingId } = await params; const { client, user, role } = await getWorkspace(weddingId);
 if (role === "viewer") return privateJson({ error: "You cannot upload media." }, 403);
 try {
  await limitRequest("media-upload", user.id, 30, 60);
  const raw = await readLimitedBody(request, 11 * 1024 * 1024); const form = await new Response(new Uint8Array(raw), { headers: { "Content-Type": request.headers.get("content-type") ?? "" } }).formData();
  const file = form.get("file"); if (!(file instanceof File) || !file.size || file.size > 10 * 1024 * 1024) return privateJson({ error: "Choose an image up to 10 MiB." }, 400);
  const bytes = new Uint8Array(await file.arrayBuffer()); const mime = imageMime(bytes); if (!mime || mime !== file.type) return privateJson({ error: "Use a valid JPEG, PNG, WebP or AVIF image matching its file type." }, 400);
  const album = form.get("album_id") ? z.uuid().parse(form.get("album_id")) : null;
  if (album) { const found = await client.from("gallery_albums").select("id").eq("wedding_id", weddingId).eq("id", album).maybeSingle(); if (found.error || !found.data) return privateJson({ error: "Album unavailable." }, 400); }
  const alt = z.string().trim().min(1).max(500).parse(form.get("alt_text") || file.name);
  const caption = z.string().max(4000).parse(form.get("caption") ?? "");
  const path = `${weddingId}/${crypto.randomUUID()}.${{ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" }[mime]}`;
  const upload = await client.storage.from("wedding-media").upload(path, bytes, { contentType: mime, upsert: false }); if (upload.error) return privateJson({ error: "Unable to upload image." }, 503);
  const asset = await client.from("media_assets").insert({ wedding_id: weddingId, object_path: path, mime_type: mime, size_bytes: bytes.byteLength }).select("id").single();
  if (asset.error) { await client.storage.from("wedding-media").remove([path]); return privateJson({ error: "Unable to record image." }, 503); }
  if (album) { const photo = await client.from("gallery_images").insert({ wedding_id: weddingId, album_id: album, image_path: path, alt_text: alt, caption }); if (photo.error) { await client.from("media_assets").delete().eq("id",asset.data.id).eq("wedding_id",weddingId); await client.storage.from("wedding-media").remove([path]); return privateJson({ error: "Unable to add photograph to album." }, 503); } }
  return privateJson({ saved: true, path });
 } catch { return privateJson({ error: "Unable to upload. Check file size, type, album and request limits." }, 400); }
}
