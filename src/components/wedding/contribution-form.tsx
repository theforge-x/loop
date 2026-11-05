"use client";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export function ContributionForm({ slug, available }: { slug: string; available: boolean }) {
  const [pending,setPending]=useState(false); const [error,setError]=useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data=new FormData(event.currentTarget); setPending(true);setError("");
    try {const response=await fetch(`/api/weddings/${slug}/contributions`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(Object.fromEntries(data))});const value=await response.json();if(!response.ok)throw new Error(value.error??"Unable to start checkout.");window.location.assign(value.authorization_url);}catch(failure){setError(failure instanceof Error?failure.message:"Unable to start checkout.");setPending(false);}
  }
  return <section className="mt-16 rounded-2xl border bg-card p-7 md:p-10"><h2 className="text-3xl">A contribution to our next chapter</h2>{available ? <form onSubmit={submit} className="mt-7 grid gap-5 md:grid-cols-2"><label className="text-sm">Amount (NGN)<Input name="amount" type="number" min="0.01" max="9999999999.99" step="0.01" required className="mt-2" /></label><label className="text-sm">Email address<Input name="email" type="email" maxLength={320} required className="mt-2" /></label><label className="text-sm">Name (optional)<Input name="name" maxLength={200} className="mt-2" /></label><label className="text-sm">Message (optional)<Input name="message" maxLength={4000} className="mt-2" /></label><div className="md:col-span-2"><Button type="submit" disabled={pending}>{pending?"Opening checkout…":"Continue to Paystack"}</Button><p className="mt-4 text-xs leading-6 text-muted-foreground">Payment details are collected by Paystack. Your contribution is confirmed after payment verification.</p>{error&&<p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}</div></form>:<p className="mt-5 text-sm leading-7 text-muted-foreground">Monetary contributions are temporarily unavailable.</p>}</section>;
}
