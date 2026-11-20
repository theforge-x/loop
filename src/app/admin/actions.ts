"use server";

import { Prisma } from "@prisma/client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { currentAdmin, endSession, requireAdmin, startSession } from "@/lib/auth";
import { allowAttempt, clientIdentity, verifyPassword } from "@/lib/security";
import { checked, field, imageField, parse } from "@/lib/admin-fields";
import { idSchema, optionalText, responseFields, shortText, UserError } from "@/lib/validation";
import { createInvitation, editInvitation, regenerateCode } from "@/services/guests";
import { overrideRsvp } from "@/services/rsvp";
import { changeReservation } from "@/services/wishlist";
import { contentSchema, publishDraft, saveDraftSection, type Wedding } from "@/services/content";
import type { ActionState } from "@/components/admin-form";

async function mutation(callback: (actor: string) => Promise<ActionState>): Promise<ActionState> {
  const admin = await requireAdmin();
  try { return await callback(admin.id); }
  catch (error) {
    if (error instanceof UserError) return { error: error.message };
    const details = error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined;
    console.error("Admin mutation failed", { type: error instanceof Error ? error.name : "Unknown", code: details });
    return { error: "The change could not be saved. Please try again." };
  }
}

export async function login(_state: ActionState, form: FormData): Promise<ActionState> {
  if (await currentAdmin()) redirect("/admin");
  const email = String(field(form, "email")).trim().toLowerCase();
  const password = String(field(form, "password"));
  const failed = { error: "The email or password is incorrect." };
  if (email.length > 254 || password.length > 128 || !z.email().safeParse(email).success) return failed;
  const client = clientIdentity(await headers());
  const [allowed, accountAllowed] = await Promise.all([
    allowAttempt("login", client, client === "shared" ? 45 : 12),
    allowAttempt("login-account", email, 8),
  ]);
  if (!allowed || !accountAllowed) return { error: "Too many attempts. Try again in a few minutes." };
  const account = await db.admin.findUnique({ where: { email } });
  if (!(await verifyPassword(password, account?.passwordHash)) || !account?.active) return failed;
  await startSession(account.id);
  redirect("/admin");
}

export async function logout() {
  await endSession();
  redirect("/admin/login");
}

const namesSchema = z.array(shortText(120)).max(100);
function groupFields(form: FormData) {
  const date = parse(z.union([z.literal(""), z.iso.date()]), field(form, "deadline"));
  const names = field(form, "names");
  const namesList = parse(z.string().max(12_100), names).split(/\r?\n/).map(name => name.trim()).filter(Boolean);
  return {
    label: parse(shortText(120), field(form, "label")),
    names: parse(namesSchema, namesList),
    deadline: date ? new Date(date + "T00:00:00Z") : null,
    disabled: checked(form, "disabled"),
  };
}

export async function saveInvitation(_state: ActionState, form: FormData) {
  return mutation(async actor => {
    const fields = groupFields(form);
    const id = field(form, "id");
    if (!id) {
      if (!fields.names.length) throw new UserError("Add at least one guest.");
      const code = await createInvitation(fields, actor);
      revalidatePath("/admin/guests");
      return { success: "Invitation created.", code };
    }
    const ids = parse(z.array(idSchema).max(100), form.getAll("guestId"));
    const entries = ids.map(guestId => ({ id: guestId, name: parse(optionalText(120), field(form, "name-" + guestId)) }));
    await editInvitation(parse(idSchema, id), fields, entries, actor);
    revalidatePath("/admin/guests");
    return { success: "Invitation updated." };
  });
}

export async function replaceCode(_state: ActionState, form: FormData) {
  return mutation(async actor => {
    const code = await regenerateCode(parse(idSchema, field(form, "id")), actor);
    return { success: "New code generated. The previous code has been disabled.", code };
  });
}

export async function saveRsvp(_state: ActionState, form: FormData) {
  return mutation(async actor => {
    const id = parse(idSchema, field(form, "id"));
    const response = parse(responseFields, { attending: form.getAll("attending"), phone: field(form, "phone"), message: field(form, "message") });
    const record = await overrideRsvp(id, response, actor);
    revalidatePath("/admin/rsvps");
    return { success: "Response saved. Reference " + record.reference };
  });
}

export async function saveGift(_state: ActionState, form: FormData) {
  return mutation(async actor => {
    const id = field(form, "id");
    const data = parse(z.object({ name: shortText(120), description: optionalText(2000), price: optionalText(60) }), {
      name: field(form, "name"), description: field(form, "description"), price: field(form, "price"),
    });
    const image = checked(form, "removeImage") ? "" : await imageField(form, "gift");
    const hidden = checked(form, "hidden");
    await db.$transaction(async tx => {
      const gift = id
        ? await tx.wishlistItem.update({ where: { id: parse(idSchema, id), archived: false }, data: { ...data, image, hidden } })
        : await tx.wishlistItem.create({ data: { ...data, image, hidden } });
      await tx.audit.create({ data: { adminId: actor, action: id ? "Updated gift" : "Created gift", subject: gift.id } });
    });
    revalidatePath("/admin/wishlist");
    return { success: "Gift saved." };
  });
}

export async function archiveGift(_state: ActionState, form: FormData) {
  return mutation(async actor => {
    const id = parse(idSchema, field(form, "id"));
    await db.$transaction(async tx => {
      const updated = await tx.wishlistItem.updateMany({ where: { id, status: { not: "RESERVED" }, archived: false }, data: { archived: true } });
      if (!updated.count) throw new UserError("Resolve the active reservation before deleting this gift.");
      await tx.audit.create({ data: { adminId: actor, action: "Deleted gift", subject: id } });
    });
    revalidatePath("/admin/wishlist");
    return { success: "Gift deleted from the wishlist." };
  });
}

export async function updateReservation(_state: ActionState, form: FormData) {
  return mutation(async actor => {
    const action = parse(z.enum(["confirm", "cancel", "receive"]), field(form, "action"));
    await changeReservation(parse(idSchema, field(form, "id")), parse(idSchema, field(form, "reservationId")), action, actor);
    revalidatePath("/admin/wishlist");
    return { success: "Reservation updated." };
  });
}

async function photo(form: FormData, prefix: string) {
  return { image: await imageField(form, prefix), alt: field(form, prefix + "Alt") };
}

function count(form: FormData, max: number) {
  return parse(z.coerce.number().int().min(0).max(max), field(form, "count"));
}

export async function saveContent(_state: ActionState, form: FormData) {
  return mutation(async actor => {
    const section = parse(contentSchema.keyof(), field(form, "section"));
    const values = (...keys: string[]) => Object.fromEntries(keys.map(key => [key, field(form, key)]));
    let input: unknown;
    switch (section) {
      case "hero": input = { ...values("firstName", "secondName", "headline", "date"), photo: await photo(form, "hero") }; break;
      case "story": input = { ...values("heading", "text"), photo: await photo(form, "story") }; break;
      case "details": input = values("heading", "venue", "address", "time", "directions"); break;
      case "programme": input = { ...values("heading"), events: Array.from({ length: count(form, 24) }, (_, index) => ({
        name: field(form, "name" + index), time: field(form, "time" + index), description: field(form, "description" + index),
      })) }; break;
      case "gallery": input = { ...values("heading"), photos: await Promise.all(Array.from({ length: count(form, 24) }, (_, index) => photo(form, "gallery" + index))) }; break;
      case "attire": input = { ...values("heading", "text"), colours: Array.from({ length: count(form, 12) }, (_, index) => ({
        name: field(form, "name" + index), hex: field(form, "hex" + index),
      })) }; break;
      case "rsvp": input = { ...values("heading", "instructions", "deadline", "confirmation"), allowLate: checked(form, "allowLate") }; break;
      case "wishlist": input = { ...values("heading", "introduction"), visible: checked(form, "visible"), showPrices: checked(form, "showPrices") }; break;
      case "footer": input = values("closing", "email", "phone"); break;
      case "settings": input = values("timezone"); break;
    }
    const patch = parse<Wedding[keyof Wedding]>(contentSchema.shape[section], input);
    await saveDraftSection(section, patch, actor);
    revalidatePath("/admin/content");
    revalidatePath("/admin/settings");
    return { success: "Draft saved." };
  });
}

export async function publishContent(_state: ActionState, _form: FormData) {
  return mutation(async actor => {
    await publishDraft(actor);
    revalidatePath("/");
    revalidatePath("/admin/content");
    revalidatePath("/admin/settings");
    return { success: "Your changes are live." };
  });
}
