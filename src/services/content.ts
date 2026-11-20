import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "../lib/db";
import { imagePath, optionalText, shortText, webUrl } from "../lib/validation";

const photo = z.object({ image: imagePath, alt: shortText(150) });
const title = shortText(100);
const body = optionalText(4000);
export const contentSchema = z.object({
  hero: z.object({ firstName: shortText(60), secondName: shortText(60), headline: title, date: z.iso.date(), photo }),
  story: z.object({ heading: title, text: body, photo }),
  details: z.object({ heading: title, venue: title, address: shortText(250), time: shortText(100), directions: z.union([z.literal(""), webUrl]) }),
  programme: z.object({ heading: title, events: z.array(z.object({ name: title, time: shortText(50), description: optionalText(500) })).max(24) }),
  gallery: z.object({ heading: title, photos: z.array(photo).max(24) }),
  attire: z.object({ heading: title, text: body, colours: z.array(z.object({ name: shortText(40), hex: z.string().regex(/^#[\da-fA-F]{6}$/) })).max(12) }),
  rsvp: z.object({ heading: title, instructions: body, deadline: z.union([z.literal(""), z.iso.date()]), allowLate: z.boolean(), confirmation: shortText(300) }),
  wishlist: z.object({ heading: title, introduction: body, visible: z.boolean(), showPrices: z.boolean() }),
  footer: z.object({ closing: shortText(250), email: z.union([z.literal(""), z.email().max(254)]), phone: optionalText(40) }),
  settings: z.object({ timezone: z.string().refine(value => {
    try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; }
  }) }),
});
export type Wedding = z.infer<typeof contentSchema>;

export const sampleWedding: Wedding = {
  hero: { firstName: "Amara", secondName: "Daniel", headline: "Together with our families", date: "2027-09-18", photo: { image: "/images/wedding-hero.jpg", alt: "A couple celebrating their wedding" } },
  story: { heading: "It started with a hello.", text: "We met on a rainy afternoon in Lagos, each waiting for a friend who was running late. One shared table turned into a conversation neither of us wanted to end.\n\nSince then, we’ve made a life out of the little things. Slow mornings, long drives and always saving the last bite for the other. We can’t wait to celebrate this next chapter with you.", photo: { image: "/images/wedding-story.jpg", alt: "A quiet moment together on a wedding day" } },
  details: { heading: "The wedding day", venue: "The Garden Court", address: "Victoria Island, Lagos, Nigeria", time: "3:00 in the afternoon", directions: "https://maps.google.com/?q=Victoria+Island+Lagos" },
  programme: { heading: "Order of celebration", events: [
    { name: "The ceremony", time: "3:00 PM", description: "Join us in the garden as we exchange our vows." },
    { name: "Drinks & photographs", time: "4:00 PM", description: "Raise a glass with us while we capture a few memories." },
    { name: "Dinner & dancing", time: "5:30 PM", description: "Settle in for dinner, then meet us on the dance floor." },
  ] },
  gallery: { heading: "A few moments", photos: [
    { image: "/images/wedding-gallery.jpg", alt: "Flowers decorating a wedding reception" },
    { image: "/images/wedding-table.jpg", alt: "Photographs from a celebration" },
    { image: "/images/wedding-hero.jpg", alt: "A wedding celebration" },
  ] },
  attire: { heading: "Dress code & colours", text: "Garden formal. Think light fabrics and comfortable shoes for an afternoon outdoors. We'd love to see touches of these colours.", colours: [
    { name: "Sage", hex: "#8d957d" }, { name: "Champagne", hex: "#c9af8d" }, { name: "Dusty rose", hex: "#bd8f88" }, { name: "Warm ivory", hex: "#eee3d0" },
  ] },
  rsvp: { heading: "Will you join us?", instructions: "Please reply using the invitation code we shared with you. We’d love to know who can celebrate with us.", deadline: "2027-08-21", allowLate: false, confirmation: "Thank you for letting us know." },
  wishlist: { heading: "Wedding wishlist", introduction: "Having you there is what matters most to us. If you’d like to give a gift, we’ve gathered a few things we’d love for our home.", visible: true, showPrices: true },
  footer: { closing: "With all our love,", email: "", phone: "" },
  settings: { timezone: "Africa/Lagos" },
};

export async function getWedding(draft = false, client: Prisma.TransactionClient = db) {
  const settings = await client.weddingSettings.findUnique({ where: { id: 1 } });
  return settings ? contentSchema.parse(draft ? settings.draft : settings.published) : null;
}

export function dateLabel(date: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeZone: "UTC" }).format(new Date(date + "T12:00:00Z"));
}

export function localDate(now: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: timezone }).formatToParts(now);
  return ["year", "month", "day"].map(type => parts.find(part => part.type === type)!.value).join("-");
}

export async function saveDraftSection<Section extends keyof Wedding>(section: Section, patch: Wedding[Section], adminId: string) {
  const jsonPath = "$." + section;
  await db.$transaction([
    db.weddingSettings.findUniqueOrThrow({ where: { id: 1 }, select: { id: true } }),
    db.$executeRaw`UPDATE wedding_settings
      SET draft = JSON_SET(draft, ${jsonPath}, JSON_EXTRACT(${JSON.stringify(patch)}, '$')), updatedAt = UTC_TIMESTAMP(3)
      WHERE id = 1`,
    db.audit.create({ data: { adminId, action: "Saved website draft", subject: section } }),
  ]);
}

export async function publishDraft(adminId: string) {
  await db.$transaction([
    db.weddingSettings.findUniqueOrThrow({ where: { id: 1 }, select: { id: true } }),
    db.$executeRaw`UPDATE wedding_settings
      SET published = draft, publishedAt = UTC_TIMESTAMP(3), updatedAt = UTC_TIMESTAMP(3)
      WHERE id = 1`,
    db.audit.create({ data: { adminId, action: "Published website", subject: "Wedding invitation" } }),
  ]);
}
