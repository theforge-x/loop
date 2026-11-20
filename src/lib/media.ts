import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { UserError } from "./validation";

export const uploadDirectory = () => path.resolve(/* turbopackIgnore: true */ process.env.UPLOAD_DIR || ".loop-data/uploads");

export async function saveImage(file: File) {
  const allowed = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp" } as const;
  const expected = allowed[file.type as keyof typeof allowed];
  if (!expected || file.size > 8 * 1024 * 1024) throw new UserError("Choose a JPEG, PNG, or WebP image up to 8 MB.");
  let image: Buffer;
  try {
    const input = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 30_000_000 });
    const metadata = await input.metadata();
    if (metadata.format !== expected || (metadata.pages ?? 1) !== 1) throw new Error("Invalid image");
    image = await input.rotate().resize({ width: 2200, height: 2200, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
  } catch {
    throw new UserError("The uploaded image could not be read.");
  }
  const filename = randomUUID() + ".webp";
  await mkdir(uploadDirectory(), { recursive: true });
  await writeFile(path.join(uploadDirectory(), filename), image, { flag: "wx" });
  return "/media/" + filename;
}
