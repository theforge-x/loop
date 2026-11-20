import { Invitation } from "@/components/invitation";
import { getWedding } from "@/services/content";
import { publicGifts } from "@/services/wishlist";

export const dynamic = "force-dynamic";

export default async function Home() {
  const wedding = await getWedding();
  if (!wedding) return <main className="section shell"><h1>Loop</h1><p>The invitation is being prepared.</p></main>;
  return <Invitation wedding={wedding} gifts={wedding.wishlist.visible ? await publicGifts() : []} />;
}
