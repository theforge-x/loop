export async function readLimitedBody(request: Request, maximum = 1048576) {
  const reader = request.body?.getReader(); if (!reader) throw new Error("Empty request");
  const chunks: Uint8Array[] = []; let size = 0;
  try { while (true) { const next = await reader.read(); if (next.done) break; size += next.value.byteLength; if (size > maximum) { await reader.cancel(); throw new Error("Request too large"); } chunks.push(next.value); } }
  finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin || origin === new URL(process.env.NEXT_PUBLIC_APP_URL ?? request.url).origin;
}
export function privateJson(value: object, status = 200) { return Response.json(value, { status, headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex" } }); }
