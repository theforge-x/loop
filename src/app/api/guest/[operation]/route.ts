import { codeSchema, guestResponse, giftReservation, UserError } from "@/lib/validation";
import { allowAttempt, clientIdentity } from "@/lib/security";
import { submitRsvp, verifyInvitation } from "@/services/rsvp";
import { reserveGift } from "@/services/wishlist";

const reply = (data: object, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request, { params }: { params: Promise<{ operation: string }> }) {
  const { operation } = await params;
  if (!["verify", "rsvp", "reserve"].includes(operation)) return reply({ error: "This action could not be found." }, 404);
  const origin = request.headers.get("origin");
  const siteOrigin = new URL(process.env.APP_URL ?? request.url).origin;
  if (origin && origin !== siteOrigin) return reply({ error: "Open the wedding website to submit this form." }, 403);

  try {
    const client = clientIdentity(request.headers);
    if (!(await allowAttempt(operation, client, client === "shared" ? 120 : 12))) {
      return reply({ error: "Too many attempts. Please try again in a few minutes." }, 429);
    }

    const reader = request.body?.getReader();
    if (!reader) return reply({ error: "Check your details and try again." }, 400);
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 16_384) {
        await reader.cancel();
        return reply({ error: "This submission is too long." }, 413);
      }
      chunks.push(value);
    }
    let data: unknown;
    try { data = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
    catch { return reply({ error: "Check your details and try again." }, 400); }

    if (operation === "verify") {
      const code = codeSchema.safeParse((data as { code?: unknown } | null)?.code);
      if (!code.success) return reply({ error: "We couldn’t find an active invitation for that code. Check it and try again." }, 400);
      return reply(await verifyInvitation(code.data));
    }
    if (operation === "rsvp") {
      const result = guestResponse.safeParse(data);
      if (!result.success) return reply({ error: "Check your invitation, phone number and message, then try again." }, 400);
      return reply(await submitRsvp(result.data.code, result.data));
    }
    const result = giftReservation.safeParse(data);
    if (!result.success) return reply({ error: "Enter your name and check your reservation details." }, 400);
    return reply(await reserveGift(result.data));
  } catch (error) {
    if (error instanceof UserError) return reply({ error: error.message }, operation === "reserve" ? 409 : 400);
    console.error("Guest action failed", { operation, type: error instanceof Error ? error.name : "Unknown" });
    return reply({ error: "Something went wrong. Please try again in a moment." }, 500);
  }
}
