import { requireAdmin } from "@/lib/auth";
import { getWedding } from "@/services/content";
import { publicGifts } from "@/services/wishlist";
import { Invitation } from "@/components/invitation";

export default async function PreviewPage() {
  await requireAdmin();
  const wedding = await getWedding(true);
  if (!wedding) return <p>Run the seed command to initialize the wedding.</p>;
  return <div className="admin-preview"><Invitation wedding={wedding} gifts={wedding.wishlist.visible ? await publicGifts() : []} preview /></div>;
}
