import { getWorkspace } from "@/lib/workspace";
import { exportGuestCsv, type GuestImportRow } from "@/lib/invitations/csv";
export async function GET(_request: Request, { params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params; const { client } = await getWorkspace(weddingId);
  const rows: GuestImportRow[] = [];
  for (let start = 0; start < 100000; start += 500) {
    const result = await client.from("guests").select("id,name,email,invitation_group_id,invitation_groups(name,guest_allowance)").eq("wedding_id", weddingId).order("id").range(start, start + 499);
    if (result.error) throw new Error("Unable to export guest records.");
    rows.push(...result.data.map(guest => ({ guest_id: guest.id, group_id: guest.invitation_group_id, group_name: guest.invitation_groups?.name ?? "", group_allowance: String(guest.invitation_groups?.guest_allowance ?? ""), guest_name: guest.name, email: guest.email ?? "" })));
    if (result.data.length < 500) return new Response(exportGuestCsv(rows), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="loop-guests-${weddingId}.csv"`, "Cache-Control": "private, no-store" } });
  }
  return new Response("Export is too large. Contact the workspace owner to export in smaller groups.", { status: 413 });
}
