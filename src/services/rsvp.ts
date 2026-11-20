import { Prisma } from "@prisma/client";
import { db } from "../lib/db";
import { codeHash, reference } from "../lib/security";
import { UserError, type responseFields } from "../lib/validation";
import type { z } from "zod";
import { getWedding, localDate } from "./content";

const inviteInclude = {
  guests: { orderBy: { position: "asc" } },
  rsvp: { include: { attendees: true } },
} satisfies Prisma.InvitationInclude;
type Group = Prisma.InvitationGetPayload<{ include: typeof inviteInclude }>;
type Response = z.infer<typeof responseFields>;

const unavailable = () => new UserError("We couldn’t find an active invitation for that code. Check it and try again.");

async function checkDeadline(group: Group, tx?: Prisma.TransactionClient) {
  const wedding = await getWedding(false, tx);
  const now = new Date();
  const deadline = group.deadline?.toISOString().slice(0, 10) ?? wedding?.rsvp.deadline;
  if (wedding && !wedding.rsvp.allowLate && deadline && localDate(now, wedding.settings.timezone) > deadline) {
    throw new UserError("Replies have closed. Please contact the couple if your plans have changed.");
  }
  return wedding;
}

export async function verifyInvitation(code: string) {
  const group = await db.invitation.findUnique({ where: { codeHash: codeHash(code) }, include: inviteInclude });
  if (!group || group.disabled || !group.guests.length) throw unavailable();
  await checkDeadline(group);
  return {
    label: group.label,
    guests: group.guests.map(({ id, name }) => ({ id, name })),
    attending: group.rsvp?.attendees.filter(entry => entry.attending).map(entry => entry.guestId) ?? null,
  };
}

export async function readLockedGroup(tx: Prisma.TransactionClient, where: { id: string } | { codeHash: string }) {
  const rows = "id" in where
    ? await tx.$queryRaw<{ id: string }[]>`SELECT id FROM invitations WHERE id = ${where.id} FOR UPDATE`
    : await tx.$queryRaw<{ id: string }[]>`SELECT id FROM invitations WHERE codeHash = ${where.codeHash} FOR UPDATE`;
  return rows[0] ? tx.invitation.findUnique({ where: { id: rows[0].id }, include: inviteInclude }) : null;
}

export async function storeResponse(tx: Prisma.TransactionClient, group: Group, response: Response, actor: string) {
  const selected = new Set(response.attending);
  const named = new Set(group.guests.map(guest => guest.id));
  if (selected.size !== response.attending.length || selected.size > group.guestLimit || [...selected].some(id => !named.has(id))) {
    throw new UserError("Choose only guests listed on this invitation.");
  }

  const status = selected.size === 0 ? "DECLINED" : selected.size === named.size ? "ACCEPTED" : "PARTIAL";
  const fields = { status, phone: response.phone, message: response.message } as const;
  const saved = group.rsvp
    ? await tx.rsvp.update({ where: { id: group.rsvp.id }, data: fields })
    : await tx.rsvp.create({ data: { ...fields, invitationId: group.id, reference: reference("RSVP") } });

  await tx.rsvpAttendee.deleteMany({ where: { rsvpId: saved.id } });
  const attendees = group.guests.map(guest => ({ guestId: guest.id, attending: selected.has(guest.id) }));
  if (attendees.length) await tx.rsvpAttendee.createMany({ data: attendees.map(entry => ({ ...entry, rsvpId: saved.id })) });
  await tx.rsvpHistory.create({
    data: {
      rsvpId: saved.id,
      actor,
      snapshot: { ...fields, attendees: group.guests.map(guest => ({ id: guest.id, name: guest.name, attending: selected.has(guest.id) })) },
    },
  });
  return saved;
}

export async function submitRsvp(code: string, response: Response) {
  return db.$transaction(async tx => {
    const group = await readLockedGroup(tx, { codeHash: codeHash(code) });
    if (!group || group.disabled || !group.guests.length) throw unavailable();
    const wedding = await checkDeadline(group, tx);
    const saved = await storeResponse(tx, group, response, "guest");
    return { reference: saved.reference, status: saved.status, confirmation: wedding?.rsvp.confirmation ?? "Your response has been saved." };
  });
}

export async function overrideRsvp(id: string, response: Response, adminId: string) {
  return db.$transaction(async tx => {
    const group = await readLockedGroup(tx, { id });
    if (!group?.guests.length) throw new UserError("Add guests to this invitation before recording a response.");
    const saved = await storeResponse(tx, group, response, "admin:" + adminId);
    await tx.audit.create({ data: { adminId, action: "Corrected RSVP", subject: saved.reference } });
    return saved;
  });
}
