import { randomUUID } from "node:crypto";
import { db } from "../lib/db";
import { codeHash, newInvitationCode } from "../lib/security";
import { UserError } from "../lib/validation";
import { readLockedGroup, storeResponse } from "./rsvp";

type GroupFields = { label: string; names: string[]; deadline: Date | null; disabled: boolean };

export async function createInvitation(fields: GroupFields, adminId: string) {
  const code = newInvitationCode();
  const id = randomUUID();
  await db.$transaction([
    db.invitation.create({ data: {
      id, label: fields.label, codeHash: codeHash(code), guestLimit: fields.names.length, deadline: fields.deadline,
      guests: { create: fields.names.map((name, position) => ({ name, position })) },
    } }),
    db.audit.create({ data: { adminId, action: "Created invitation", subject: id } }),
  ]);
  return code;
}

export async function editInvitation(id: string, fields: GroupFields, entries: { id: string; name: string }[], adminId: string) {
  await db.$transaction(async tx => {
    const group = await readLockedGroup(tx, { id });
    if (!group) throw new UserError("Invitation not found.");
    const known = new Set(group.guests.map(guest => guest.id));
    const supplied = new Set(entries.map(guest => guest.id));
    if (supplied.size !== entries.length || [...supplied].some(id => !known.has(id)) || known.size !== supplied.size) {
      throw new UserError("The guest list changed. Reload the page and try again.");
    }
    const newCount = entries.filter(guest => guest.name).length + fields.names.length;
    if (!newCount || newCount > 100) throw new UserError("Each invitation needs between 1 and 100 guests.");

    await tx.rsvpAttendee.deleteMany({ where: { guestId: { in: entries.filter(guest => !guest.name).map(guest => guest.id) } } });
    await tx.guest.deleteMany({ where: { invitationId: id, id: { in: entries.filter(guest => !guest.name).map(guest => guest.id) } } });
    const updated = entries.filter(guest => guest.name);
    for (const [position, guest] of updated.entries()) {
      await tx.guest.update({ where: { id: guest.id }, data: { name: guest.name, position } });
    }
    const newGuests = await Promise.all(fields.names.map((name, index) => tx.guest.create({ data: { invitationId: id, name, position: index + updated.length } })));
    await tx.invitation.update({ where: { id }, data: { label: fields.label, deadline: fields.deadline, disabled: fields.disabled, guestLimit: newCount } });
    const namesChanged = fields.names.length > 0 || entries.some(guest => group.guests.find(old => old.id === guest.id)?.name !== guest.name);
    if (group.rsvp && namesChanged) {
      const guests = [...updated.map((guest, position) => ({ ...guest, invitationId: id, position })), ...newGuests];
      const remaining = new Set(guests.map(guest => guest.id));
      await storeResponse(tx, { ...group, guests, guestLimit: newCount }, {
        attending: group.rsvp.attendees.filter(entry => entry.attending && remaining.has(entry.guestId)).map(entry => entry.guestId),
        phone: group.rsvp.phone,
        message: group.rsvp.message,
      }, "admin:" + adminId);
    }
    await tx.audit.create({ data: { adminId, action: "Updated invitation", subject: id } });
  });
}

export async function regenerateCode(id: string, adminId: string) {
  const code = newInvitationCode();
  await db.$transaction([
    db.invitation.update({ where: { id }, data: { codeHash: codeHash(code) } }),
    db.audit.create({ data: { adminId, action: "Regenerated invitation code", subject: id } }),
  ]);
  return code;
}
