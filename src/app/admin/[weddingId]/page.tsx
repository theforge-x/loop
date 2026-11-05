import { redirect } from "next/navigation";
import { getWorkspace } from "@/lib/workspace";
export default async function WorkspacePage({ params }: { params: Promise<{ weddingId: string }> }) { const { wedding } = await getWorkspace((await params).weddingId); redirect(`/admin/${wedding.id}/guests`); }
