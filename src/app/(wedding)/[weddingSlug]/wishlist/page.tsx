import { getRegistry, getMediaUrls } from "@/lib/wedding/data";
import { ContributionForm } from "@/components/wedding/contribution-form";
import { RegistryCards } from "@/components/wedding/registry";
import { EmptyContent } from "@/components/wedding/primitives";
import { getWedding, weddingMetadata } from "@/lib/wedding/data";
import { PageIntro } from "@/components/wedding/primitives";
export async function generateMetadata({ params }: { params: Promise<{ weddingSlug: string }> }) { return weddingMetadata((await params).weddingSlug, "/wishlist", "Wishlist"); }
export default async function Page({ params }: { params: Promise<{ weddingSlug: string }> }) {
 const wedding = await getWedding((await params).weddingSlug);
 const registry = await getRegistry(wedding.id);
 const urls = await getMediaUrls(wedding.id, registry.items.flatMap(item => item.image_path ? [item.image_path] : []));
 const groups = [...registry.categories, { id: null, title: "Gifts" }];
 return <><PageIntro wedding={wedding} title="A little wish list" description="Thoughtful gifts for the life we’re building together." />{registry.items.length ? groups.map(category => { const items=registry.items.filter(item => item.category_id===category.id); return items.length ? <section key={category.id ?? "other"} className="py-12">{registry.categories.length>0 && <h2 className="mb-8 text-3xl">{category.title}</h2>}<RegistryCards items={items} urls={urls} slug={wedding.slug} /></section> : null; }) : <EmptyContent>Gift wishes will appear here.</EmptyContent>}{wedding.content.contributions_enabled && <ContributionForm slug={wedding.slug} available={Boolean(process.env.PAYSTACK_SECRET_KEY)} />}</>;
}
