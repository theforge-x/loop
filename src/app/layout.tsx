import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: { default: "Loop — A little closer to forever", template: "%s | Loop" },
  description: "A thoughtful home for your wedding, your guests, and everything that brings you together.",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className="min-h-dvh antialiased"><a href="#main-content" className="fixed top-3 left-3 z-50 -translate-y-24 rounded-full bg-primary px-5 py-3 text-primary-foreground focus:translate-y-0">Skip to content</a>{children}</body></html>;
}
