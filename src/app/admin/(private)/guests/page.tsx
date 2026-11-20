import type { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminForm } from "@/components/admin-form";
import { replaceCode, saveInvitation } from "../../actions";

export default async function GuestsPage({ searchParams }: { searchParams: Promise<{ q?: string; state?: string; page?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 120) : "";
  const where: Prisma.InvitationWhereInput = {
    ...(query ? { OR: [{ label: { contains: query } }, { guests: { some: { name: { contains: query } } } }] } : {}),
    ...(params.state === "active" ? { disabled: false } : params.state === "disabled" ? { disabled: true } : {}),
  };
  const total = await db.invitation.count({ where });
  const page = Math.max(1, Math.min(Math.ceil(total / 25), Number.parseInt(params.page ?? "1", 10) || 1));
  const groups = await db.invitation.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "asc" }], skip: (page - 1) * 25, take: 25, include: { guests: { orderBy: { position: "asc" } } } });
  const pageUrl = (value: number) => "?" + new URLSearchParams({ q: query, state: params.state ?? "", page: String(value) });

  return <>
    <div className="admin-title"><h1>Guest management</h1><a className="button button-outline" href="/admin/export/guests">Export guest list</a></div>
    <details className="admin-panel edit-section">
      <summary><h2>Create an invitation</h2></summary>
      <AdminForm action={saveInvitation} resetOnSuccess>
        <div className="admin-fields"><label>Invitation name<input name="label" maxLength={120} required /></label><label>Reply deadline (optional)<input type="date" name="deadline" /></label></div>
        <label>Guest names, one per line<textarea name="names" rows={4} maxLength={12100} required /></label>
        <button className="button">Create and generate code</button>
      </AdminForm>
    </details>
    <form className="admin-panel admin-filter">
      <label>Search by invitation or guest<input name="q" type="search" defaultValue={query} maxLength={120} /></label>
      <label>Invitation status<select name="state" defaultValue={params.state ?? ""}><option value="">All</option><option value="active">Active</option><option value="disabled">Disabled</option></select></label>
      <button className="button">Filter</button>
    </form>
    {groups.length === 0 && <p>No invitations found.</p>}
    {groups.map(group => <details className="admin-panel edit-section" key={group.id}>
      <summary><h2>{group.label}</h2><span>{group.guests.length} {group.guests.length === 1 ? "guest" : "guests"} · {group.disabled ? "Disabled" : "Active"}</span></summary>
      <AdminForm action={saveInvitation}>
        <input type="hidden" name="id" value={group.id} />
        <div className="admin-fields">
          <label>Invitation name<input name="label" defaultValue={group.label} maxLength={120} required /></label>
          <label>Reply deadline (optional)<input type="date" name="deadline" defaultValue={group.deadline?.toISOString().slice(0, 10)} /></label>
        </div>
        <p>Clear a guest’s name to remove them.</p>
        <div className="admin-fields">{group.guests.map(guest => <label key={guest.id}>Guest name
          <input type="hidden" name="guestId" value={guest.id} /><input name={"name-" + guest.id} defaultValue={guest.name} maxLength={120} />
        </label>)}</div>
        <label>Add guests, one per line<textarea name="names" rows={2} data-clear-on-save maxLength={12100} /></label>
        <label className="check"><input type="checkbox" name="disabled" defaultChecked={group.disabled} /> Disable invitation</label>
        <button className="button">Save invitation</button>
      </AdminForm>
      <details className="sub-details"><summary>Replace invitation code</summary>
        <p>Share the new code with every guest on this invitation.</p>
        <AdminForm action={replaceCode}><input type="hidden" name="id" value={group.id} /><button className="button button-outline">Generate new code</button></AdminForm>
      </details>
    </details>)}
    {total > 25 && <div className="admin-row">{page > 1 && <a href={pageUrl(page - 1)}>Previous</a>}<span>Page {page} of {Math.ceil(total / 25)}</span>{page * 25 < total && <a href={pageUrl(page + 1)}>Next</a>}</div>}
  </>;
}
