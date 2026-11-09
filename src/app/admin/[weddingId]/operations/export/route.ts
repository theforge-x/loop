import { stringify } from "csv-stringify/sync";
import { getWorkspace } from "@/lib/workspace";
export async function GET(_request: Request, { params }: { params: Promise<{ weddingId: string }> }) {
 const { weddingId } = await params; const { client } = await getWorkspace(weddingId);
 const [attendees,seats,tables,checks,events] = await Promise.all([client.from("rsvp_attendees").select("id,guest_name").eq("wedding_id",weddingId).limit(10000),client.from("seat_assignments").select("attendee_id,seating_table_id").eq("wedding_id",weddingId).limit(10000),client.from("seating_tables").select("id,name").eq("wedding_id",weddingId).limit(10000),client.from("check_ins").select("attendee_id,event_id,checked_in_at").eq("wedding_id",weddingId).limit(10000),client.from("events").select("id,title").eq("wedding_id",weddingId).limit(10000)]);
 if ([attendees,seats,tables,checks,events].some(r=>r.error)) return new Response("Unable to export report.",{status:500});
 if ([attendees,seats,tables,checks,events].some(r=>r.data!.length>=1000)) return new Response("Report exceeds the interactive export limit. Use a scoped database export to avoid truncation.",{status:409});
 const rows=attendees.data!.map(a=>({attendee:a.guest_name,table:tables.data!.find(t=>t.id===seats.data!.find(s=>s.attendee_id===a.id)?.seating_table_id)?.name??"",check_ins:checks.data!.filter(c=>c.attendee_id===a.id).map(c=>`${events.data!.find(e=>e.id===c.event_id)?.title}: ${c.checked_in_at}`).join("; ")}));
 return new Response(stringify(rows,{header:true,columns:["attendee","table","check_ins"],escape_formulas:true}),{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":"attachment; filename=seating-check-in.csv","Cache-Control":"private, no-store"}});
}
