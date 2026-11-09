import Link from "next/link";
import { getWorkspace } from "@/lib/workspace";
import { QrCheckin } from "@/components/admin/qr-checkin";
export default async function CheckinPage({params}:{params:Promise<{weddingId:string}>}){const {weddingId}=await params;const {role}=await getWorkspace(weddingId);if(role==="viewer")return <p>Check-in requires an owner, administrator or coordinator.</p>;return <div className="space-y-7"><h2 className="text-3xl">Guest check-in</h2><Link href={`/admin/${weddingId}/operations`} className="text-sm underline">Search attendees manually</Link><QrCheckin id={weddingId}/></div>;}
