import { getStory, getMediaUrls } from "@/lib/wedding/data";
import { WeddingPhoto, EmptyContent } from "@/components/wedding/primitives";
import { getWedding, weddingMetadata } from "@/lib/wedding/data";
import { PageIntro } from "@/components/wedding/primitives";
export async function generateMetadata({ params }: { params: Promise<{ weddingSlug: string }> }) { return weddingMetadata((await params).weddingSlug, "/story", "Our story"); }
export default async function Page({ params }: { params: Promise<{ weddingSlug: string }> }) {
 const wedding = await getWedding((await params).weddingSlug);
 const stories = await getStory(wedding.id);
 const urls = await getMediaUrls(wedding.id, stories.flatMap(story => story.image_path ? [story.image_path] : []));
 return <><PageIntro wedding={wedding} title="Our story" description={wedding.content.story_intro} />{stories.length ? <div className="space-y-20 py-14">{stories.map((story, index) => <section key={story.id} className="grid items-center gap-10 md:grid-cols-2 md:gap-16"><div className={index % 2 ? "md:order-2" : ""}><p className="mb-4 text-xs tracking-widest text-accent-foreground">{String(index + 1).padStart(2, "0")}</p><h2 className="text-4xl">{story.title}</h2><p className="mt-6 whitespace-pre-line leading-8 text-muted-foreground">{story.content}</p></div>{story.image_path && urls[story.image_path] && <WeddingPhoto src={urls[story.image_path]} alt={story.title} className="rounded-t-[4rem]" />}</section>)}</div> : <EmptyContent>Our story will be shared here.</EmptyContent>}</>;
}
