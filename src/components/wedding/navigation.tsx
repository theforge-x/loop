"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { Menu } from "lucide-react";
export function WeddingNavigation({ slug }: { slug: string }) {
  const pathname = usePathname();
  const menu = useRef<HTMLDetailsElement>(null);
  const links = [["Our story", "story"], ["The events", "events"], ["RSVP", "rsvp"], ["Gifts", "wishlist"], ["Gallery", "gallery"], ["Travel", "travel"], ["FAQ", "faq"], ["Guestbook", "guestbook"]];
  const items = links.map(([label, path]) => <Link key={path} href={`/${slug}/${path}`} aria-current={pathname === `/${slug}/${path}` ? "page" : undefined} onClick={() => menu.current?.removeAttribute("open")} className="block py-2 text-sm text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:text-accent-foreground">{label}</Link>);
  return <><nav aria-label="Wedding navigation" className="hidden items-center gap-5 lg:flex">{items}</nav><details ref={menu} className="relative lg:hidden"><summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border px-4 py-2 text-sm focus-visible:outline-2 focus-visible:outline-ring">Menu <Menu aria-hidden="true" className="size-4" /></summary><nav aria-label="Mobile wedding navigation" className="absolute top-12 right-0 z-40 w-64 rounded-xl border bg-card p-5 shadow-lg">{items}</nav></details></>;
}
