import { WeddingHomeView } from "@/components/wedding/home-view";
import { getWedding, getEvents, getStory, getGallery, getRegistry, getAnnouncements, getMediaUrls, weddingMetadata } from "@/lib/wedding/data";
export async function generateMetadata({ params }: { params: Promise<{ weddingSlug: string }> }) { return weddingMetadata((await params).weddingSlug); }
export default async function WeddingHome({ params }: { params: Promise<{ weddingSlug: string }> }) {
  const wedding = await getWedding((await params).weddingSlug);
  const [events, stories, gallery, registry, announcements] = await Promise.all([getEvents(wedding.id), getStory(wedding.id), getGallery(wedding.id), getRegistry(wedding.id), getAnnouncements(wedding.id)]);
  const paths = [wedding.content.hero_image_path, ...stories.slice(0, 1).map(story => story.image_path), ...gallery.images.slice(0, 6).map(image => image.image_path), ...registry.items.slice(0, 3).map(item => item.image_path)].filter((path): path is string => Boolean(path));
  const urls = await getMediaUrls(wedding.id, paths);
  return <WeddingHomeView wedding={wedding} events={events} stories={stories} gallery={gallery} registry={registry} announcements={announcements} urls={urls} />;
}
