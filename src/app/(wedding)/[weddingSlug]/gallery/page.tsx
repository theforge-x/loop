import { getGallery, getMediaUrls } from "@/lib/wedding/data";
import { PhotoGallery } from "@/components/wedding/gallery";
import { EmptyContent } from "@/components/wedding/primitives";
import { getWedding, weddingMetadata } from "@/lib/wedding/data";
import { PageIntro } from "@/components/wedding/primitives";
export async function generateMetadata({ params }: { params: Promise<{ weddingSlug: string }> }) { return weddingMetadata((await params).weddingSlug, "/gallery", "Gallery"); }
export default async function Page({ params }: { params: Promise<{ weddingSlug: string }> }) {
 const wedding = await getWedding((await params).weddingSlug);
 const gallery = await getGallery(wedding.id);
 const urls = await getMediaUrls(wedding.id, gallery.images.map(image => image.image_path));
 return <><PageIntro wedding={wedding} title="Moments, together" />{gallery.images.some(image => Boolean(urls[image.image_path])) ? gallery.albums.map(album => { const photos=gallery.images.filter(image => image.album_id===album.id && urls[image.image_path]).map(image => ({id:image.id,src:urls[image.image_path],alt:image.alt_text,caption:image.caption})); return photos.length ? <section key={album.id} className="py-12"><h2 className="mb-4 text-3xl">{album.title}</h2>{album.description && <p className="mb-8 leading-7 text-muted-foreground">{album.description}</p>}<PhotoGallery photos={photos} /></section> : null; }) : <EmptyContent>Photographs will be shared here.</EmptyContent>}</>;
}
