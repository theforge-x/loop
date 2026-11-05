import type { Metadata } from "next";
import Link from "next/link";
import { getReservation } from "@/lib/gifts/reservation";
import { CancelGift } from "@/components/wedding/gift-controls";
import { limitRequest } from "@/lib/invitations/rate-limit";
export const metadata: Metadata = { title: "Your gift reservation", robots: { index: false, follow: false, noarchive: true } };
export const dynamic = "force-dynamic";
export default async function ReservationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params; await limitRequest("view-gift-reservation",token,30,60); const reservation = await getReservation(token);
  return <main id="main-content" className="mx-auto max-w-xl px-6 py-24"><p className="text-xs tracking-widest uppercase text-muted-foreground">{reservation.wedding.partner_one_name} &amp; {reservation.wedding.partner_two_name}</p><h1 className="mt-6 text-5xl">Your gift reservation</h1><div className="mt-10 rounded-2xl border bg-card p-8"><h2 className="text-3xl">{reservation.item.title}</h2><p className="mt-5 text-muted-foreground">Quantity: {reservation.quantity} · {reservation.status}</p>{reservation.status==="reserved"&&<CancelGift token={token}/>}<p className="mt-6 text-sm leading-7 text-muted-foreground">Keep this link private. A gift reservation is separate from a monetary contribution.</p></div><Link href={`/${reservation.wedding.slug}/wishlist`} className="mt-8 inline-block border-b text-sm">Back to the wishlist</Link></main>;
}
