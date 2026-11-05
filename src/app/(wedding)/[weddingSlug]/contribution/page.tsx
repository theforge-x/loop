import Link from "next/link";
import { notFound } from "next/navigation";
import { getWedding, weddingMetadata } from "@/lib/wedding/data";
import { createTrustedClient } from "@/lib/supabase/admin";
import { PageIntro } from "@/components/wedding/primitives";
import { limitRequest } from "@/lib/invitations/rate-limit";
export async function generateMetadata({params}:{params:Promise<{weddingSlug:string}>}) { return { ...await weddingMetadata((await params).weddingSlug,"/contribution","Your contribution"), robots:{index:false,follow:false} }; }
export default async function ContributionPage({params,searchParams}:{params:Promise<{weddingSlug:string}>;searchParams:Promise<{reference?:string}>}) {
 const wedding=await getWedding((await params).weddingSlug);const {reference}=await searchParams;
 if(!reference||!/^loop-[a-f0-9-]{36}$/.test(reference))notFound();await limitRequest("contribution-status",reference,30,60);
 const result=await createTrustedClient().from("contributions").select("status,amount_minor,currency").eq("wedding_id",wedding.id).eq("reference",reference).maybeSingle();
 if(result.error)throw new Error("Unable to load payment status.");if(!result.data)notFound();
 const payment=result.data;
 return <div className="mx-auto max-w-3xl px-6 py-14"><PageIntro wedding={wedding} title={payment.status==="successful"?"Thank you, with love.":payment.status==="failed"?"Checkout wasn’t completed.":"Awaiting payment confirmation."}/><p className="mt-8 leading-8 text-muted-foreground">{payment.status==="successful"?`Your contribution of ${new Intl.NumberFormat("en-NG",{style:"currency",currency:payment.currency}).format(payment.amount_minor/100)} has been verified.`:payment.status==="failed"?"You can return to the wishlist and try again.":"Your payment has not yet been verified. Return to this page after confirmation; the checkout redirect alone does not confirm a payment."}</p><Link href={`/${wedding.slug}/wishlist`} className="mt-8 inline-block border-b text-sm">Back to the wishlist</Link></div>;
}
