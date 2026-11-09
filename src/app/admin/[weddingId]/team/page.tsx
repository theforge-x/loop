import { getWorkspace } from "@/lib/workspace";
import { ActionForm } from "@/components/admin/action-form";
import { Card } from "@/components/ui/card";
import { teamAction } from "./actions";
export default async function TeamPage({ params }: { params: Promise<{ weddingId: string }> }) {
 const { weddingId } = await params; const { client, role } = await getWorkspace(weddingId);
 if (!["owner", "admin"].includes(role)) return <p>Team permissions are managed by an owner or administrator.</p>;
 const members = await client.from("wedding_members").select("id,profile_id,role,profiles(display_name)").eq("wedding_id", weddingId).order("created_at");
 if (members.error) throw new Error("Unable to load team.");
 const roles = role === "owner" ? ["owner", "admin", "coordinator", "viewer"] : ["coordinator", "viewer"];
 const select = (value: string) => <label className="block text-sm">Role<select name="role" defaultValue={value} className="m-3 rounded border p-2">{roles.map(r => <option key={r}>{r}</option>)}</select></label>;
 return <div className="space-y-6"><h2 className="text-3xl">Team permissions</h2><p className="text-sm">Use an existing registered account’s profile ID to add a teammate. Keep at least one owner.</p>{members.data.map(m => <Card key={m.id}><p>{m.profiles?.display_name || "Team member"} · {m.role}</p>{roles.includes(m.role) && <ActionForm action={teamAction.bind(null, weddingId)} label="Update membership"><input type="hidden" name="id" value={m.id} />{select(m.role)}<label>Action<select name="operation" className="m-3 rounded border p-2"><option value="save">Change role</option><option value="delete">Remove member</option></select></label><label className="block"><input type="checkbox" required /> Confirm team change</label></ActionForm>}</Card>)}<Card><h3 className="mb-4 text-2xl">Add teammate</h3><ActionForm action={teamAction.bind(null, weddingId)} label="Add member"><label className="block">Account profile ID<input name="profile_id" required className="mt-2 block w-full rounded border p-3" /></label>{select("viewer")}</ActionForm></Card></div>;
}
