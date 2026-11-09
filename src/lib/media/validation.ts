export function imageMime(bytes: Uint8Array): string | null {
 const b = Buffer.from(bytes); if (b.length < 16) return null;
 if (b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return "image/png";
 if (b[0] === 255 && b[1] === 216 && b[2] === 255) return "image/jpeg";
 if (b.toString("ascii",0,4) === "RIFF" && b.toString("ascii",8,12) === "WEBP") return "image/webp";
 if (b.toString("ascii",4,8) === "ftyp" && /avif|avis/.test(b.toString("ascii",8,32))) return "image/avif";
 return null;
}
