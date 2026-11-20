import type { WishlistItem } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminForm } from "@/components/admin-form";
import { archiveGift, saveGift, updateReservation } from "../../actions";

function GiftEditor({ gift }: { gift?: WishlistItem }) {
  return <AdminForm action={saveGift} resetOnSuccess={!gift}>
    {gift && <input type="hidden" name="id" value={gift.id} />}
    <div className="admin-fields">
      <label>Gift name<input name="name" defaultValue={gift?.name} maxLength={120} required /></label>
      <label>Estimated price (optional)<input name="price" defaultValue={gift?.price} maxLength={60} /></label>
    </div>
    <label>Description<textarea name="description" defaultValue={gift?.description} maxLength={2000} rows={3} /></label>
    {gift?.image && <img className="admin-thumb" src={gift.image} alt="" width={128} height={90} />}
    <input type="hidden" name="giftImage" value={gift?.image ?? ""} />
    <label>Gift photo<input name="giftFile" type="file" accept="image/jpeg,image/png,image/webp" /></label>
    {gift?.image && <label className="check"><input type="checkbox" name="removeImage" /> Remove current photo</label>}
    <label className="check"><input type="checkbox" name="hidden" defaultChecked={gift?.hidden} /> Hide from the public wishlist</label>
    <button className="button">{gift ? "Save gift" : "Add gift"}</button>
  </AdminForm>;
}

const statuses = { AVAILABLE: "Available", RESERVED: "Reserved", RECEIVED: "Received" };
const reservationStatuses = { RESERVED: "Reserved", CONFIRMED: "Confirmed", RECEIVED: "Received", CANCELLED: "Cancelled" };

export default async function WishlistPage() {
  await requireAdmin();
  const gifts = await db.wishlistItem.findMany({ orderBy: [{ archived: "asc" }, { createdAt: "desc" }], include: { reservations: { orderBy: { createdAt: "desc" } } } });
  return <>
    <div className="admin-title"><h1>Wishlist management</h1></div>
    <details className="admin-panel edit-section" open><summary><h2>Add a gift</h2></summary><GiftEditor /></details>
    {gifts.map(gift => <details className="admin-panel edit-section" key={gift.id}>
      <summary><h2>{gift.name}</h2><span>{gift.archived ? "Deleted" : gift.hidden ? "Hidden · " + statuses[gift.status] : statuses[gift.status]}</span></summary>
      {!gift.archived && <GiftEditor gift={gift} />}
      {!!gift.reservations.length && <section className="sub-details"><h3>Reservations</h3>
        <ul className="history">{gift.reservations.map(reservation => <li key={reservation.id}>
          <strong>{reservation.guestName}</strong> · {reservationStatuses[reservation.status]}
          <p>{reservation.reference} · {reservation.createdAt.toISOString().slice(0, 10)}</p>
          {reservation.contact && <p>{reservation.contact}</p>}{reservation.message && <p>{reservation.message}</p>}
          {gift.status === "RESERVED" && reservation.activeItemId === gift.id && <AdminForm action={updateReservation}>
            <input type="hidden" name="id" value={gift.id} /><input type="hidden" name="reservationId" value={reservation.id} />
            <div className="admin-row">
              {reservation.status === "RESERVED" && <button className="button button-outline" name="action" value="confirm">Confirm reservation</button>}
              <button className="button button-outline" name="action" value="receive">Mark as received</button>
              <button className="button button-outline" name="action" value="cancel">Cancel reservation</button>
            </div>
          </AdminForm>}
        </li>)}</ul>
      </section>}
      {!gift.archived && gift.status !== "RESERVED" && <details className="sub-details"><summary>Delete gift</summary>
        <AdminForm action={archiveGift}><input type="hidden" name="id" value={gift.id} /><button className="button button-outline">Delete from wishlist</button></AdminForm>
      </details>}
    </details>)}
  </>;
}
