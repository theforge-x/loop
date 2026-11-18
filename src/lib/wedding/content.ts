import type { CSSProperties } from "react";
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

function luminance(hex: string) {
  const values = hex.slice(1).match(/.{2}/g)!.map(part => {
    const value = parseInt(part, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
}
export function weddingThemeStyle(theme: z.infer<typeof themeSchema>): CSSProperties {
  const primary = theme.primary ?? "#344b3d";
  const background = theme.background ?? "#faf7f1";
  const foreground = theme.foreground ?? "#303b32";
  const accent = theme.accent ?? "#e6d5c0";
  const contrast = (a: string, b: string) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
  const contrastText = (color: string) => contrast(color, "#171c18") > contrast(color, "#ffffff") ? "#171c18" : "#ffffff";
  const tokens = {
    "--primary": primary, "--primary-foreground": contrastText(primary),
    "--background": background, "--foreground": foreground,
    "--card": theme.background ?? "#fffdf9", "--card-foreground": foreground,
    "--secondary": `color-mix(in srgb, ${background} 92%, ${foreground})`, "--secondary-foreground": foreground,
    "--muted": `color-mix(in srgb, ${background} 94%, ${foreground})`,
    "--muted-foreground": `color-mix(in srgb, ${foreground} 80%, ${background})`,
    "--border": `color-mix(in srgb, ${background} 80%, ${foreground})`,
    "--input": `color-mix(in srgb, ${background} 60%, ${foreground})`,
    "--ring": contrast(primary, background) >= 3 ? primary : foreground,
    "--accent": accent, "--accent-foreground": theme.accent ? (contrast(accent, background) >= 4.5 ? accent : foreground) : (contrast("#865d41", background) >= 4.5 ? "#865d41" : foreground),
  };
  return Object.fromEntries(Object.entries(tokens).map(([key, value]) => [key.replace("--", "--wedding-"), value])) as CSSProperties;
}
