import { getEvents } from "@/lib/wedding/data";
import { EventList, EmptyContent } from "@/components/wedding/primitives";
import { getWedding, weddingMetadata } from "@/lib/wedding/data";
import { PageIntro } from "@/components/wedding/primitives";
export async function generateMetadata({ params }: { params: Promise<{ weddingSlug: string }> }) { return weddingMetadata((await params).weddingSlug, "/events", "Events"); }
export default async function Page({ params }: { params: Promise<{ weddingSlug: string }> }) {
 const wedding = await getWedding((await params).weddingSlug);
 const events = await getEvents(wedding.id);
 return <><PageIntro wedding={wedding} title="The celebrations" description="The places, the times, and the little details for coming together." /><div className="py-12">{events.length ? <EventList events={events} timezone={wedding.timezone} /> : <EmptyContent>Celebration details will appear here.</EmptyContent>}</div></>;
}
