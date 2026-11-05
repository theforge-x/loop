import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { invitationSchema } from "@/lib/invitations/validation";
import { limitRequest } from "@/lib/invitations/rate-limit";
import { RsvpForm, type RsvpInitial } from "@/components/wedding/rsvp-form";
import { createTrustedClient } from "@/lib/supabase/admin";
import { createPublicClient } from "@/lib/supabase/public";
import { formatWeddingDate } from "@/lib/wedding/content";
import { Button } from "@/components/ui/button";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your invitation", robots: { index: false, follow: false, noarchive: true } };
export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (token.length < 43 || token.length > 256) notFound();
  await limitRequest("invitation-view", token, 60, 60);
  const trusted = createTrustedClient();
  const response = await trusted.rpc("get_invitation", { p_token: token });
  if (response.error) { if (response.error.code === "P0001") notFound(); throw new Error("Unable to load invitation."); }
  const parsed = invitationSchema.safeParse(response.data);
  if (!parsed.success) throw new Error("Unexpected invitation response.");
  const invitation = parsed.data;
  const weddingResult = await createPublicClient().from("weddings").select("slug,partner_one_name,partner_two_name,wedding_date,timezone").eq("id", invitation.wedding_id).eq("is_published", true).maybeSingle();
  if (weddingResult.error) throw new Error("Unable to load wedding.");
  if (!weddingResult.data) notFound();
  const wedding = weddingResult.data;
  const rsvp = await trusted.from("rsvps").select("*").eq("wedding_id", invitation.wedding_id).eq("invitation_group_id", invitation.id).maybeSingle();
  if (rsvp.error) throw new Error("Unable to load your response.");
  let initial: RsvpInitial | undefined;
  if (rsvp.data) {
    const [attendees, attendance] = await Promise.all([trusted.from("rsvp_attendees").select("guest_name,guest_id,attendee_type").eq("wedding_id", invitation.wedding_id).eq("rsvp_id", rsvp.data.id).order("is_primary", { ascending: false }), trusted.from("event_attendance").select("event_id").eq("wedding_id", invitation.wedding_id).eq("rsvp_id", rsvp.data.id)]);
    if (attendees.error || attendance.error) throw new Error("Unable to load your attendees.");
    initial = { status: rsvp.data.status, attendees: attendees.data.map(attendee => ({ name: attendee.guest_name, ...(attendee.guest_id ? { guest_id: attendee.guest_id } : {}), type: attendee.attendee_type as "guest" | "plus_one" | "child" })), event_ids: [...new Set(attendance.data.map(row => row.event_id))], dietary: rsvp.data.dietary_requirements ?? "", accessibility: rsvp.data.accessibility_requirements ?? "", message: rsvp.data.message ?? "" };
  }
  return <main id="main-content" className="mx-auto min-h-dvh max-w-3xl px-6 py-16 text-center md:py-24"><p className="text-xs tracking-[0.25em] uppercase text-muted-foreground">A personal invitation</p><div className="mt-10 rounded-t-full border bg-card px-6 pt-20 pb-12 md:px-16"><p className="font-serif text-2xl italic text-accent-foreground">Dear {invitation.name},</p><h1 className="mt-8 text-5xl leading-tight md:text-6xl">{wedding.partner_one_name}<span className="block text-4xl italic">&amp;</span>{wedding.partner_two_name}</h1>{wedding.wedding_date && <p className="mt-8 text-sm tracking-wider uppercase">{formatWeddingDate(wedding.wedding_date, wedding.timezone)}</p>}<p className="mt-8 leading-8 text-muted-foreground">Your invitation includes up to {invitation.allowance} {invitation.allowance === 1 ? "guest" : "guests"}.</p>{invitation.guests.length > 0 && <ul className="mt-5 space-y-2 text-sm">{invitation.guests.map(guest => <li key={guest.id}>{guest.name}</li>)}</ul>}{invitation.events.length > 0 && <div className="mt-10 border-t pt-8">{invitation.events.map(event => <section key={event.id} className="mb-7"><h2 className="text-2xl">{event.title}</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">{formatWeddingDate(event.starts_at, wedding.timezone, true)}{event.venue_name && <><br />{event.venue_name}</>}</p></section>)}</div>}<RsvpForm token={token} invitation={invitation} initial={initial} /><Button asChild className="mt-8"><Link href={`/${wedding.slug}`}>Explore the wedding</Link></Button></div></main>;
}
