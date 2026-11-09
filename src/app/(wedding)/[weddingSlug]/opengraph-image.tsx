import { ImageResponse } from "next/og";
import { getWedding } from "@/lib/wedding/data";
export const alt = "An invitation to celebrate";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default async function WeddingImage({ params }: { params: Promise<{ weddingSlug: string }> }) {
 const wedding = await getWedding((await params).weddingSlug);
 return new ImageResponse(<div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", width: "100%", height: "100%", padding: 72, background: wedding.theme.background ?? "#faf7f1", color: wedding.theme.foreground ?? "#303b32", textAlign: "center" }}><div style={{ display: "flex", fontSize: 22, letterSpacing: 5, marginBottom: 36 }}>TOGETHER WITH OUR FAVOURITE PEOPLE</div><div style={{ display: "flex", fontSize: 76, lineHeight: 1.2 }}>{wedding.partner_one_name} &amp; {wedding.partner_two_name}</div><div style={{ display: "flex", marginTop: 48, fontSize: 28 }}>{wedding.wedding_date ? new Date(wedding.wedding_date).toLocaleDateString("en-GB", { dateStyle: "long", timeZone: wedding.timezone }) : "A celebration to share"}</div><div style={{ display: "flex", fontSize: 18, marginTop: 54 }}>WITH LOVE · LOOP</div></div>, size);
}
