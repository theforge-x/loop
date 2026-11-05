"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export function ReserveGift({ slug, itemId, remaining }: { slug: string; itemId: string; remaining: number }) {
  const [open, setOpen] = useState(false); const [pending, setPending] = useState(false); const [error, setError] = useState(""); const [saved, setSaved] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setPending(true); setError("");
    try { const response = await fetch(`/api/weddings/${slug}/gifts/${itemId}/reserve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quantity: Number(form.get("quantity")), name: String(form.get("name") ?? ""), email: String(form.get("email") ?? ""), message: String(form.get("message") ?? ""), reveal_identity: form.get("reveal_identity") === "on" }) }); const value = await response.json(); if (!response.ok) throw new Error(value.error ?? "Unable to reserve this gift."); setSaved(value.cancellation_url); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Unable to reserve this gift."); } finally { setPending(false); }
  }
  if (saved) return <div className="mt-5 space-y-3 text-sm"><p role="status">Your gift is reserved. Keep this private link to manage or cancel it.</p><Link className="inline-block border-b" href={saved}>Manage your reservation ↗</Link></div>;
  if (!open) return <Button type="button" size="sm" className="mt-5" disabled={remaining < 1} onClick={() => setOpen(true)}>{remaining < 1 ? "Fully reserved" : "Reserve this gift"}</Button>;
  return <form onSubmit={submit} className="mt-6 space-y-4 border-t pt-5"><label className="block text-sm">Quantity<Input type="number" name="quantity" min={1} max={remaining} defaultValue={1} required className="mt-2" /></label><label className="block text-sm">Your name (optional)<Input name="name" maxLength={200} className="mt-2" /></label><label className="block text-sm">Email for confirmation (optional)<Input name="email" type="email" maxLength={320} className="mt-2" /></label><label className="block text-sm">Message (optional)<textarea name="message" maxLength={4000} className="mt-2 min-h-20 w-full rounded-xl border bg-background p-3" /></label><label className="flex items-start gap-2 text-xs leading-6"><input name="reveal_identity" type="checkbox" className="mt-1" />I’m happy for the couple to acknowledge my name publicly.</label><p className="text-xs leading-6 text-muted-foreground">This reserves a physical gift for you to purchase separately. No payment is collected here.</p><Button type="submit" size="sm" disabled={pending}>{pending ? "Reserving…" : "Confirm reservation"}</Button>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</form>;
}
export function CancelGift({ token }: { token: string }) {
  const router = useRouter(); const [pending,setPending]=useState(false); const [error,setError]=useState("");
  return <div className="mt-7"><Button type="button" variant="outline" disabled={pending} onClick={async()=>{setPending(true);setError("");try{const response=await fetch(`/api/gift-reservations/${token}/cancel`,{method:"POST"});const result=await response.json();if(!response.ok)throw new Error(result.error??"Unable to cancel this reservation.");router.refresh();}catch(failure){setError(failure instanceof Error?failure.message:"Unable to cancel.");}finally{setPending(false);}}}>{pending?"Cancelling…":"Cancel reservation"}</Button>{error&&<p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}</div>;
}
