"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { Menu } from "lucide-react";
export function WeddingNavigation({ slug }: { slug: string }) {
  const pathname = usePathname();
  const menu = useRef<HTMLDetailsElement>(null);
  const links = [["Home", ""], ["Our story", "story"], ["The events", "events"], ["RSVP", "rsvp"], ["Gifts", "wishlist"], ["Gallery", "gallery"], ["Travel", "travel"], ["FAQ", "faq"], ["Guestbook", "guestbook"]];
  const items = links.map(([label, path]) => <Link key={path} href={path ? `/${slug}/${path}` : `/${slug}`} aria-current={pathname === (path ? `/${slug}/${path}` : `/${slug}`) ? "page" : undefined} onClick={() => menu.current?.removeAttribute("open")} className={`block rounded-full px-3 py-2.5 text-xs transition-colors ${path === "rsvp" ? "bg-primary text-primary-foreground hover:opacity-85" : "text-muted-foreground hover:bg-secondary hover:text-foreground aria-[current=page]:bg-secondary aria-[current=page]:text-foreground"}`}>{label}</Link>);
  return <><nav aria-label="Wedding navigation" className="hidden items-center gap-1 lg:flex">{items}</nav><details ref={menu} onKeyDown={event => { if (event.key === "Escape") { menu.current?.removeAttribute("open"); menu.current?.querySelector("summary")?.focus(); } }} className="relative lg:hidden"><summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border px-4 py-2 text-sm focus-visible:outline-2 focus-visible:outline-ring">Menu <Menu aria-hidden="true" className="size-4" /></summary><nav aria-label="Mobile wedding navigation" className="absolute top-12 right-0 z-40 w-[min(18rem,calc(100vw-3rem))] rounded-2xl border bg-card p-5 shadow-lg">{items}</nav></details></>;
}
