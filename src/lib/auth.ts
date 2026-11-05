import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
// Identity only. Wedding membership authorization is a separate Phase 2 gate.
export async function requireUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/sign-in");
  return user;
}
