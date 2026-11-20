import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Loop — Wedding invitation",
  description: "Wedding details, RSVP and gift wishlist.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
