import { z } from "zod";

export const idSchema = z.union([z.cuid(), z.uuid()]);
export const shortText = (max: number) => z.string().trim().min(1).max(max);
export const optionalText = (max: number) => z.string().trim().max(max);
export const phone = z.string().trim().regex(/^\+?[\d(). -]{7,40}$/).refine(value => (value.match(/\d/g)?.length ?? 0) >= 7, "Enter a reachable phone number.");
export const codeSchema = z.string().trim().max(40).refine(code => /^[a-fA-F0-9]{24}$/.test(code.replace(/[-\s]/g, "")));
export const responseFields = z.object({
  attending: z.array(idSchema).max(100),
  phone,
  message: optionalText(1500),
});
export const guestResponse = responseFields.extend({ code: codeSchema });
export const giftReservation = z.object({
  itemId: idSchema,
  guestName: shortText(120),
  contact: optionalText(120),
  message: optionalText(1500),
});
export const imagePath = z.string().regex(/^\/(?:images\/[a-zA-Z0-9_-]+\.(?:jpg|webp)|media\/[a-f0-9-]{36}\.webp)$/);
export const webUrl = z.string().url().refine(url => new URL(url).protocol === "https:");
export class UserError extends Error {}
