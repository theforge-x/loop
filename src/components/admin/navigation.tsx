"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { ArrowUpRight, CalendarDays, CheckCheck, ChevronDown, Gift, Heart, Home, Image, LayoutTemplate, Mail, Settings, Users, Wallet, type LucideIcon } from "lucide-react";

const groups: { title: string; links: [string, string, LucideIcon][] }[] = [
  { title: "Plan your day", links: [["", "Overview", Home], ["guests", "Guests & invitations", Users], ["content/events", "Events", CalendarDays], ["registry", "Gift registry", Gift]] },
  { title: "Your website", links: [["website", "Website & theme", LayoutTemplate], ["content/story", "Story", Heart], ["media", "Media library", Image], ["content/albums", "Albums", Image], ["content/images", "Photographs", Image], ["content/travel", "Travel", CalendarDays], ["content/faq", "FAQ", Mail], ["content/announcements", "Announcements", Mail]] },
  { title: "Manage the celebration", links: [["communication", "Communication", Mail], ["check-in", "QR check-in", CheckCheck], ["operations", "Attendance & seating", Users], ["payments", "Payments", Wallet], ["team", "Team", Settings]] },
];

export function AdminNavigation({ id, slug, published }: { id: string; slug: string; published: boolean }) {
  const pathname = usePathname();
  const menu = useRef<HTMLDetailsElement>(null);
  const base = `/admin/${id}`;
  const active = groups.flatMap(group => group.links).find(([path]) => pathname === (path ? `${base}/${path}` : base));
  const links = <div className="space-y-6">{groups.map(group => <div key={group.title}><p className="mb-2 px-3 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">{group.title}</p><ul className="space-y-1">{group.links.map(([path, label, Icon]) => {
    const href = path ? `${base}/${path}` : base;
    return <li key={path}><Link href={href} onClick={() => menu.current?.removeAttribute("open")} aria-current={pathname === href ? "page" : undefined} className="flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground aria-[current=page]:bg-primary aria-[current=page]:font-medium aria-[current=page]:text-primary-foreground"><Icon aria-hidden="true" className="size-4 shrink-0" />{label}</Link></li>;
  })}</ul></div>)}<div className="border-t pt-4"><Link href={published ? `/${slug}` : `${base}/preview`} className="flex items-center justify-between gap-2 rounded-xl border bg-card px-3 py-3 text-sm hover:bg-secondary/60">{published ? "View website" : "Preview website"}<ArrowUpRight aria-hidden="true" className="size-4" /></Link><Link href="/admin" className="mt-3 block px-3 py-2 text-xs text-muted-foreground hover:text-foreground">All your weddings</Link></div></div>;
  return <><nav aria-label="Workspace navigation" className="sticky top-28 hidden max-h-[calc(100dvh-8rem)] overflow-y-auto pr-2 pb-5 lg:block">{links}</nav><details ref={menu} className="rounded-2xl border bg-card p-3 lg:hidden"><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-2 text-sm font-medium">{active?.[1] ?? "Workspace navigation"}<ChevronDown aria-hidden="true" className="size-4" /></summary><nav aria-label="Mobile workspace navigation" className="border-t pt-5">{links}</nav></details></>;
}
