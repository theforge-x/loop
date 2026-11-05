import { getFaqs } from "@/lib/wedding/data";
import { EmptyContent } from "@/components/wedding/primitives";
import { getWedding, weddingMetadata } from "@/lib/wedding/data";
import { PageIntro } from "@/components/wedding/primitives";
export async function generateMetadata({ params }: { params: Promise<{ weddingSlug: string }> }) { return weddingMetadata((await params).weddingSlug, "/faq", "FAQ"); }
export default async function Page({ params }: { params: Promise<{ weddingSlug: string }> }) {
 const wedding = await getWedding((await params).weddingSlug);
 const faqs = await getFaqs(wedding.id);
 return <><PageIntro wedding={wedding} title="A few things to know" />{faqs.length ? <div className="mx-auto max-w-3xl py-10">{faqs.map(faq => <details key={faq.id} className="group border-b py-6"><summary className="cursor-pointer text-lg leading-7 focus-visible:outline-2 focus-visible:outline-ring">{faq.question}</summary><p className="mt-5 whitespace-pre-line leading-8 text-muted-foreground">{faq.answer}</p></details>)}</div> : <EmptyContent>Answers to common questions will appear here.</EmptyContent>}</>;
}
