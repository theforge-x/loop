import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
export default async function AdminPage() {
  const user = await requireUser();
  const client = await createClient();
  const result = await client.from("wedding_members").select("wedding_id,role,weddings(title)").eq("profile_id", user.id);
  if (result.error) throw new Error("Unable to load workspaces.");
  return <><p className="mb-4 text-xs tracking-[0.2em] uppercase text-muted-foreground">Your workspace</p><h1 className="text-5xl">A place for every detail.</h1>{result.data.length ? <div className="mt-10 grid gap-5 sm:grid-cols-2">{result.data.map(member => <Card key={member.wedding_id}><h2 className="text-2xl"><Link href={`/admin/${member.wedding_id}/guests`}>{member.weddings?.title ?? "Wedding workspace"}</Link></h2><p className="mt-3 text-sm text-muted-foreground">{member.role}</p></Card>)}</div> : <Card className="mt-10 max-w-2xl"><h2 className="text-2xl">Your wedding starts here</h2><p className="mt-3 leading-7 text-muted-foreground">Wedding workspaces will appear here once they have been set up.</p></Card>}</>;
}
