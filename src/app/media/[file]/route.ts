import { readFile } from "node:fs/promises";
import path from "node:path";
import { uploadDirectory } from "@/lib/media";

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!/^[a-f0-9-]{36}\.webp$/.test(file)) return new Response(null, { status: 404 });
  try {
    const image = await readFile(path.join(uploadDirectory(), file));
    return new Response(new Uint8Array(image), {
      headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return new Response(null, { status: 404 });
    throw error;
  }
}
