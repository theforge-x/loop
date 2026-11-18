import { AdminNavigation } from "@/components/admin/navigation";
import { getWorkspace } from "@/lib/workspace";
export default async function WorkspaceLayout({ params, children }: { params: Promise<{ weddingId: string }>; children: React.ReactNode }) {
  const { wedding, role } = await getWorkspace((await params).weddingId);
  return <><div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b pb-7"><div className="min-w-0"><p className="mb-3 text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">{role} workspace</p><h1 className="break-words text-3xl tracking-tight sm:text-4xl">{wedding.title}</h1></div><span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs"><span className={`size-1.5 rounded-full ${wedding.is_published ? "bg-primary" : "bg-accent-foreground"}`} />{wedding.is_published ? "Website published" : "Private draft"}</span></div><div className="grid items-start gap-7 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10"><AdminNavigation id={wedding.id} slug={wedding.slug} published={wedding.is_published} /><div className="min-w-0">{children}</div></div></>;
}
