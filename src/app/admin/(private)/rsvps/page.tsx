import { Attendance, type Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminForm } from "@/components/admin-form";
import { saveRsvp } from "../../actions";

const statuses = { ACCEPTED: "Accepted", PARTIAL: "Partially attending", DECLINED: "Declined", PENDING: "Pending" };

export default async function RsvpsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  await requireAdmin();
  const { status, q } = await searchParams;
  const query = typeof q === "string" ? q.trim().slice(0, 120) : "";
  const marker = status && Object.values(Attendance).find(value => value === status);
  const where: Prisma.InvitationWhereInput = {
    ...(status === "PENDING" ? { rsvp: null } : marker ? { rsvp: { status: marker } } : {}),
    ...(query ? { label: { contains: query } } : {}),
  };
  const groups = await db.invitation.findMany({
    where, orderBy: { label: "asc" },
    include: { guests: { orderBy: { position: "asc" } }, rsvp: { include: { attendees: true, history: { orderBy: { createdAt: "desc" } } } } },
  });
  return <>
    <div className="admin-title"><h1>RSVP responses</h1><a className="button button-outline" href="/admin/export/rsvps">Export RSVPs</a></div>
    <form className="admin-panel admin-filter">
      <label>Invitation name<input name="q" type="search" defaultValue={query} maxLength={120} /></label>
      <label>Response status<select name="status" defaultValue={status ?? ""}><option value="">All</option>{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <button className="button">Filter</button>
    </form>
    {!groups.length && <p>No responses match this filter.</p>}
    {groups.map(group => <details className="admin-panel edit-section" key={group.id}>
      <summary><h2>{group.label}</h2><span>{statuses[group.rsvp?.status ?? "PENDING"]}{group.disabled && " · Disabled invitation"}</span></summary>
      <AdminForm action={saveRsvp}>
        <input type="hidden" name="id" value={group.id} />
        {group.rsvp && <p>Reference <b>{group.rsvp.reference}</b></p>}
        <fieldset className="choice-list"><legend>Attending guests</legend>
          {group.guests.map(guest => <label key={guest.id}><input type="checkbox" name="attending" value={guest.id} defaultChecked={group.rsvp?.attendees.some(entry => entry.guestId === guest.id && entry.attending)} /> {guest.name}</label>)}
        </fieldset>
        <label>Phone number<input name="phone" type="tel" defaultValue={group.rsvp?.phone} maxLength={40} required /></label>
        <label>Message<textarea name="message" defaultValue={group.rsvp?.message} rows={3} maxLength={1500} /></label>
        <button className="button">Save response</button>
      </AdminForm>
      {!!group.rsvp?.history.length && <details className="sub-details"><summary>Response history ({group.rsvp.history.length})</summary>
        <ol className="history">{group.rsvp.history.map(revision => {
          const snapshot = revision.snapshot as { status: Attendance; phone: string; message: string; attendees: { id: string; name: string; attending: boolean }[] };
          return <li key={revision.id}><strong>{statuses[snapshot.status]}</strong> · {revision.actor === "guest" ? "Guest" : "Admin"} · <time dateTime={revision.createdAt.toISOString()}>{revision.createdAt.toISOString().replace("T", " ").slice(0, 16)} UTC</time>
            <p>{snapshot.attendees.filter(person => person.attending).map(person => person.name).join(", ") || "No attending guests"}</p>
            <p>{snapshot.phone}{snapshot.message && " · " + snapshot.message}</p>
          </li>;
        })}</ol>
      </details>}
    </details>)}
  </>;
}
