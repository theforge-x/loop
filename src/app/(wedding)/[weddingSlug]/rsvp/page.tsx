import { Mail } from "lucide-react";
import { getWedding, weddingMetadata } from "@/lib/wedding/data";
import { PageIntro } from "@/components/wedding/primitives";
export async function generateMetadata({ params }: { params: Promise<{ weddingSlug: string }> }) { return weddingMetadata((await params).weddingSlug, "/rsvp", "RSVP"); }
export default async function Page({ params }: { params: Promise<{ weddingSlug: string }> }) {
 const wedding = await getWedding((await params).weddingSlug);
 return <><PageIntro wedding={wedding} title="Will you join us?" /><section className="mx-auto max-w-xl py-16 text-center"><Mail aria-hidden="true" strokeWidth={1} className="mx-auto mb-7 size-12 text-accent-foreground" /><h2 className="text-3xl">Your personal invitation</h2><p className="mt-6 leading-8 text-muted-foreground">Please keep the personal invitation link shared with you handy. It identifies your invitation and the guests included in your group.</p></section></>;
}
