import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatWeddingDate, safeExternalUrl } from "@/lib/wedding/content";
import type { Wedding, getEvents } from "@/lib/wedding/data";
export function PageIntro({ wedding, title, description }: { wedding: Wedding; title: string; description?: string }) {
  return <div className="border-b border-border pb-12"><p className="mb-5 text-xs tracking-[0.22em] uppercase text-muted-foreground">{wedding.partner_one_name} &amp; {wedding.partner_two_name}</p><h1 className="text-5xl tracking-[-0.04em] sm:text-7xl">{title}</h1>{description && <p className="mt-6 max-w-2xl whitespace-pre-line leading-8 text-muted-foreground">{description}</p>}</div>;
}
export function EmptyContent({ children }: { children: React.ReactNode }) { return <p className="py-14 leading-8 text-muted-foreground">{children}</p>; }
export function SectionHeading({ title, href, linkText }: { title: string; href?: string; linkText?: string }) {
  return <div className="mb-9 flex flex-wrap items-end justify-between gap-6"><h2 className="text-4xl tracking-[-0.03em] md:text-5xl">{title}</h2>{href && <Link className="inline-flex items-center gap-2 border-b pb-1 text-sm" href={href}>{linkText ?? "Discover more"}<ArrowUpRight aria-hidden="true" className="size-4" /></Link>}</div>;
}
export function WeddingPhoto({ src, alt, priority = false, className = "" }: { src: string; alt: string; priority?: boolean; className?: string }) {
  return <div className={`relative aspect-[4/5] overflow-hidden bg-secondary ${className}`}><Image src={src} alt={alt} fill priority={priority} sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" /></div>;
}
export function EventList({ events, timezone }: { events: Awaited<ReturnType<typeof getEvents>>; timezone: string }) {
  return <div className="grid gap-6 md:grid-cols-2">{events.map(event => { const map = safeExternalUrl(event.map_url); return <article key={event.id} className="rounded-2xl border bg-card p-7 md:p-9"><p className="text-xs tracking-wider uppercase text-accent-foreground">{formatWeddingDate(event.starts_at, timezone, true)}</p><h2 className="mt-5 text-3xl">{event.title}</h2>{event.venue_name && <p className="mt-5 flex gap-2 text-sm"><MapPin aria-hidden="true" className="size-4 shrink-0" />{event.venue_name}</p>}{event.address && <p className="mt-2 text-sm leading-6 text-muted-foreground">{event.address}</p>}{event.description && <p className="mt-5 whitespace-pre-line leading-7 text-muted-foreground">{event.description}</p>}{event.dress_code && <p className="mt-5 text-sm"><span className="text-muted-foreground">Dress code: </span>{event.dress_code}</p>}{map && <Button asChild variant="outline" size="sm" className="mt-6"><a href={map} target="_blank" rel="noopener noreferrer">View map <ArrowUpRight aria-hidden="true" /></a></Button>}</article>; })}</div>;
}
