"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
export async function signIn(_previous: { error: string } | null, formData: FormData) {
  const result = z.object({ email: z.email(), password: z.string().min(1).max(256) }).safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!result.success) return { error: "Enter a valid email address and password." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(result.data);
  if (error) return { error: "We couldn’t sign you in. Check your details and try again." };
  redirect("/admin");
}
export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error("Sign out failed. Please try again.");
  redirect("/sign-in");
}
