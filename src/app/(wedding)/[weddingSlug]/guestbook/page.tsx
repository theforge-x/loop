import { getMessages } from "@/lib/wedding/data";
import { EmptyContent } from "@/components/wedding/primitives";
import { getWedding, weddingMetadata } from "@/lib/wedding/data";
import { PageIntro } from "@/components/wedding/primitives";
export async function generateMetadata({ params }: { params: Promise<{ weddingSlug: string }> }) { return weddingMetadata((await params).weddingSlug, "/guestbook", "Guestbook"); }
export default async function Page({ params }: { params: Promise<{ weddingSlug: string }> }) {
 const wedding = await getWedding((await params).weddingSlug);
 const messages = await getMessages(wedding.id);
 return <><PageIntro wedding={wedding} title="Words we’ll keep" description="A collection of love and well wishes from our favourite people." />{messages.length ? <div className="grid gap-6 py-12 md:grid-cols-2">{messages.map(message => <figure key={message.id} className="rounded-2xl bg-secondary/60 p-8"><blockquote className="whitespace-pre-line font-serif text-2xl leading-relaxed">{message.message}</blockquote><figcaption className="mt-6 text-xs tracking-wider uppercase text-muted-foreground">{message.name}</figcaption></figure>)}</div> : <EmptyContent>Shared memories and well wishes will appear here.</EmptyContent>}</>;
}
