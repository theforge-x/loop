import { z } from "zod";
export const contentSchema = z.object({
  identity: z.object({ title: z.string().min(1).max(200), partner_one_name: z.string().min(1).max(200), partner_two_name: z.string().min(1).max(200), wedding_date: z.string(), timezone: z.string() }).optional(),
  instagram_url: z.url().refine(v => v.startsWith("https://")).optional(),
  contributions_enabled: z.boolean().optional(),
  hero_image_path: z.string().max(4000).optional(), hero_caption: z.string().max(4000).optional(),
  welcome_heading: z.string().max(4000).optional(), welcome_text: z.string().max(4000).optional(),
  story_intro: z.string().max(4000).optional(), venue_name: z.string().max(4000).optional(), venue_address: z.string().max(4000).optional(),
  footer_text: z.string().max(4000).optional(), seo_description: z.string().max(4000).optional(),
  section_visibility: z.record(z.string(), z.boolean()).optional(),
});
const color = z.string().regex(/^#[a-fA-F0-9]{6}$/);
export const themeSchema = z.object({ primary: color.optional(), background: color.optional(), accent: color.optional(), foreground: color.optional(), font: z.enum(["serif", "sans"]).optional(), button_style: z.enum(["rounded", "square"]).optional() });
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
