import { getTravel } from "@/lib/wedding/data";
import { safeExternalUrl } from "@/lib/wedding/content";
import { EmptyContent } from "@/components/wedding/primitives";
import { getWedding, weddingMetadata } from "@/lib/wedding/data";
import { PageIntro } from "@/components/wedding/primitives";
export async function generateMetadata({ params }: { params: Promise<{ weddingSlug: string }> }) { return weddingMetadata((await params).weddingSlug, "/travel", "Travel"); }
export default async function Page({ params }: { params: Promise<{ weddingSlug: string }> }) {
 const wedding = await getWedding((await params).weddingSlug);
 const information = await getTravel(wedding.id);
 return <><PageIntro wedding={wedding} title="Making your way here" description="Travel, accommodation, and a little help along the way." />{information.length ? <div className="grid gap-8 py-12 md:grid-cols-2">{information.map(info => { const link=safeExternalUrl(info.link_url); return <section key={info.id} className="rounded-2xl border bg-card p-8"><p className="text-xs tracking-wider uppercase text-muted-foreground">{info.information_type}</p><h2 className="mt-4 text-3xl">{info.title}</h2><p className="mt-5 whitespace-pre-line leading-8 text-muted-foreground">{info.content}</p>{link && <a href={link} target="_blank" rel="noopener noreferrer" className="mt-6 inline-block border-b text-sm">More details ↗</a>}</section>; })}</div> : <EmptyContent>Travel and accommodation details will appear here.</EmptyContent>}</>;
}
