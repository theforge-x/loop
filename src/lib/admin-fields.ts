import { z } from "zod";
import { saveImage } from "./media";
import { imagePath, UserError } from "./validation";

export const field = (form: FormData, name: string) => form.get(name) ?? "";
export const checked = (form: FormData, name: string) => form.get(name) === "on";

export function parse<T>(schema: z.ZodType<T>, value: unknown) {
  const result = schema.safeParse(value);
  if (!result.success) {
    const issue = result.error.issues[0];
    const label = issue.path.length ? String(issue.path.at(-1)).replace(/([A-Z])/g, " $1").toLowerCase() : "details";
    throw new UserError(`Check the ${label} and try again.`);
  }
  return result.data;
}

export async function imageField(form: FormData, prefix: string) {
  const file = form.get(prefix + "File");
  if (file instanceof File && file.size) return saveImage(file);
  const current = field(form, prefix + "Image");
  return current ? parse(imagePath, current) : "";
}
