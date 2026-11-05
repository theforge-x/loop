import { z } from "zod";
export const contentSchema = z.object({
  hero_image_path: z.string().optional(), hero_caption: z.string().optional(),
  welcome_heading: z.string().optional(), welcome_text: z.string().optional(),
  story_intro: z.string().optional(), venue_name: z.string().optional(), venue_address: z.string().optional(),
  footer_text: z.string().optional(), seo_description: z.string().optional(),
  section_visibility: z.record(z.string(), z.boolean()).optional(),
});
const color = z.string().regex(/^#[a-fA-F0-9]{6}$/);
export const themeSchema = z.object({ primary: color.optional(), background: color.optional(), accent: color.optional(), foreground: color.optional() });
export function safeExternalUrl(value: string | null | undefined) {
  if (!value) return null;
  try { const url = new URL(value); return url.protocol === "https:" ? url.toString() : null; }
  catch { return null; }
}
export function formatWeddingDate(value: string | null, timezone: string, withTime = false) {
  if (!value) return "Details to follow";
  const options: Intl.DateTimeFormatOptions = { dateStyle: "long", ...(withTime ? { timeStyle: "short" as const } : {}), timeZone: timezone };
  try { return new Intl.DateTimeFormat("en-GB", options).format(new Date(value)); }
  catch { return new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" }).format(new Date(value)); }
}
