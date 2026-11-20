import { currentAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

const csvCell = (value: unknown) => {
  const text = String(value ?? "");
  const safe = /^[\s\uFEFF]*[=+\-@]|^[\r\n\t]/u.test(text) ? "'" + text : text;
  return '"' + safe.replace(/"/g, '""') + '"';
};

export async function GET(_request: Request, { params }: { params: Promise<{ kind: string }> }) {
  if (!(await currentAdmin())) return new Response("Sign in to export records.", { status: 401 });
  const { kind } = await params;
  if (kind !== "guests" && kind !== "rsvps") return new Response(null, { status: 404 });
  const groups = await db.invitation.findMany({
    orderBy: { label: "asc" },
    include: { guests: { orderBy: { position: "asc" } }, rsvp: { include: { attendees: true } } },
  });
  const rows = kind === "guests"
    ? [["Invitation", "Guest", "Enabled", "Reply deadline"], ...groups.flatMap(group => group.guests.map(guest =>
      [group.label, guest.name, !group.disabled, group.deadline?.toISOString().slice(0, 10)]))]
    : [["Invitation", "Guest", "Response", "Attending", "Phone", "Message", "Reference", "Updated (UTC)"], ...groups.flatMap(group => group.guests.map(guest => [
      group.label, guest.name, group.rsvp?.status ?? "PENDING",
      group.rsvp ? group.rsvp.attendees.some(entry => entry.guestId === guest.id && entry.attending) : "",
      group.rsvp?.phone, group.rsvp?.message, group.rsvp?.reference, group.rsvp?.updatedAt.toISOString(),
    ]))];
  return new Response("\uFEFF" + rows.map(row => row.map(csvCell).join(",")).join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="loop-${kind}.csv"`, "Cache-Control": "private, no-store" },
  });
}
