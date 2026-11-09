import { z } from "zod";
export type Field = { name: string; label: string; type?: "textarea" | "datetime-local" | "number" | "checkbox" | "url"; required?: boolean };
const text = z.string().trim().min(1).max(4000);
const optional = z.string().trim().max(4000).nullable();
const order = z.coerce.number().int().min(-100000).max(100000);
const date = z.iso.datetime({ offset: true });
const url = z.union([z.url().refine(value => value.startsWith("https://")), z.literal(""), z.null()]);
export const modules = {
 story: { table: "story_sections", title: "Our story", roles: ["owner", "admin"], schema: z.object({ title: text, content: optional, image_path: optional, section_type: text, sort_order: order }), fields: [{ name: "title", label: "Chapter title", required: true }, { name: "content", label: "Story", type: "textarea" }, { name: "image_path", label: "Library image path" }, { name: "section_type", label: "Section type", required: true }, { name: "sort_order", label: "Display order", type: "number" }] },
 events: { table: "events", title: "Events", roles: ["owner", "admin", "coordinator"], schema: z.object({ title: text, description: optional, starts_at: date, ends_at: date.nullable(), venue_name: optional, address: optional, map_url: url, dress_code: optional, is_private: z.boolean(), sort_order: order }).refine(v => !v.ends_at || v.ends_at >= v.starts_at, "End must follow start"), fields: [{ name: "title", label: "Event title", required: true }, { name: "description", label: "Description", type: "textarea" }, { name: "starts_at", label: "Starts (UTC)", type: "datetime-local", required: true }, { name: "ends_at", label: "Ends (UTC)", type: "datetime-local" }, { name: "venue_name", label: "Venue" }, { name: "address", label: "Address" }, { name: "map_url", label: "HTTPS map link", type: "url" }, { name: "dress_code", label: "Dress code" }, { name: "is_private", label: "Private event", type: "checkbox" }, { name: "sort_order", label: "Display order", type: "number" }] },
 faq: { table: "faqs", title: "Frequently asked questions", roles: ["owner", "admin"], schema: z.object({ question: text, answer: text, sort_order: order }), fields: [{ name: "question", label: "Question", required: true }, { name: "answer", label: "Answer", type: "textarea", required: true }, { name: "sort_order", label: "Display order", type: "number" }] },
 travel: { table: "travel_information", title: "Travel information", roles: ["owner", "admin"], schema: z.object({ title: text, content: text, information_type: text, link_url: url, sort_order: order }), fields: [{ name: "title", label: "Title", required: true }, { name: "content", label: "Details", type: "textarea", required: true }, { name: "information_type", label: "Type (travel, accommodation, transport)", required: true }, { name: "link_url", label: "HTTPS link", type: "url" }, { name: "sort_order", label: "Display order", type: "number" }] },
 announcements: { table: "announcements", title: "Announcements", roles: ["owner", "admin", "coordinator"], schema: z.object({ title: text, content: text, publish_at: date }), fields: [{ name: "title", label: "Title", required: true }, { name: "content", label: "Message", type: "textarea", required: true }, { name: "publish_at", label: "Publish after (UTC)", type: "datetime-local", required: true }] },
 albums: { table: "gallery_albums", title: "Gallery albums", roles: ["owner", "admin", "coordinator"], schema: z.object({ title: text, description: optional, sort_order: order }), fields: [{ name: "title", label: "Album title", required: true }, { name: "description", label: "Description", type: "textarea" }, { name: "sort_order", label: "Display order", type: "number" }] },
 images: { table: "gallery_images", title: "Gallery photographs", roles: ["owner", "admin", "coordinator"], schema: z.object({ album_id: z.uuid(), image_path: text, alt_text: text, caption: optional, sort_order: order }), fields: [{ name: "album_id", label: "Album ID", required: true }, { name: "image_path", label: "Library image path", required: true }, { name: "alt_text", label: "Image description", required: true }, { name: "caption", label: "Caption" }, { name: "sort_order", label: "Display order", type: "number" }] },
} as const;
export type ModuleKey = keyof typeof modules;
export function moduleKey(value: string): ModuleKey { if (!(value in modules) || !Object.hasOwn(modules, value)) throw new Error("Unknown content module."); return value as ModuleKey; }
export function parseFields(key: ModuleKey, form: FormData) {
 const input: Record<string, unknown> = {};
 for (const field of modules[key].fields as readonly Field[]) {
  const value = String(form.get(field.name) ?? "");
  input[field.name] = field.type === "checkbox" ? form.get(field.name) === "on" : field.type === "number" ? value || 0 : field.type === "datetime-local" ? value ? new Date(`${value}Z`).toISOString() : null : value || (field.required ? "" : null);
 }
 return modules[key].schema.parse(input);
}
