import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
export const getWorkspace = cache(async (id: string) => {
  if (!z.uuid().safeParse(id).success) notFound();
  const user = await requireUser();
  const client = await createClient();
  const membership = await client.from("wedding_members").select("role").eq("wedding_id", id).eq("profile_id", user.id).maybeSingle();
  if (membership.error) throw new Error("Unable to load workspace membership.");
  if (!membership.data) notFound();
  const wedding = await client.from("weddings").select("*").eq("id", id).single();
  if (wedding.error) throw new Error("Unable to load workspace.");
  return { client, user, wedding: wedding.data, role: membership.data.role };
});
export async function requireGuestOperator(id: string) {
  const workspace = await getWorkspace(id);
  if (!["owner", "admin", "coordinator"].includes(workspace.role)) throw new Error("You do not have permission to manage guests.");
  return workspace;
}
