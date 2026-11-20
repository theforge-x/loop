import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function Dashboard() {
  await requireAdmin();
  const [guests, invitations, responses, gifts] = await Promise.all([
    db.guest.count({ where: { invitation: { disabled: false } } }),
    db.invitation.count({ where: { disabled: false } }),
    db.rsvp.groupBy({ by: ["status"], _count: { _all: true }, where: { invitation: { disabled: false } } }),
    db.wishlistItem.groupBy({ by: ["status"], _count: { _all: true }, where: { archived: false, hidden: false } }),
  ]);
  const replyCount = (status: string) => responses.find(row => row.status === status)?._count._all ?? 0;
  const giftCount = (status: string) => gifts.find(row => row.status === status)?._count._all ?? 0;
  return <>
    <div className="admin-title"><h1>Wedding overview</h1><a className="button" href="/admin/content">Edit invitation</a></div>
    <section className="admin-panel"><h2>Guests and RSVPs</h2><dl className="metrics">
      {[
        ["Invited guests", guests], ["Accepted", replyCount("ACCEPTED")], ["Partially attending", replyCount("PARTIAL")],
        ["Declined", replyCount("DECLINED")], ["Pending", invitations - responses.reduce((sum, row) => sum + row._count._all, 0)],
      ].map(([label, total]) => <div key={label}><dt>{label}</dt><dd>{total}</dd></div>)}
    </dl><a className="underlined" href="/admin/rsvps">View responses</a></section>
    <section className="admin-panel"><h2>Gift wishlist</h2><dl className="metrics">
      {[["Available", giftCount("AVAILABLE")], ["Reserved", giftCount("RESERVED")], ["Received", giftCount("RECEIVED")]].map(([label, total]) =>
        <div key={label}><dt>{label}</dt><dd>{total}</dd></div>)}
    </dl><a className="underlined" href="/admin/wishlist">Manage wishlist</a></section>
  </>;
}
