import Link from "next/link";
import { getWorkspace } from "@/lib/workspace";
export default async function WorkspaceLayout({ params, children }: { params: Promise<{ weddingId: string }>; children: React.ReactNode }) {
  const { wedding, role } = await getWorkspace((await params).weddingId);
  return <><div className="mb-10 flex flex-wrap items-end justify-between gap-6 border-b pb-6"><div><p className="mb-2 text-xs tracking-wider uppercase text-muted-foreground">{role} workspace</p><h1 className="text-4xl">{wedding.title}</h1></div><nav aria-label="Workspace navigation" className="flex flex-wrap gap-5 text-sm"><Link href={`/admin/${wedding.id}/guests`}>Guests &amp; invitations</Link><Link href={`/${wedding.slug}`}>View website ↗</Link></nav></div>{children}</>;
}
