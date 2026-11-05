"use client";
import type { Database } from "@/lib/supabase/database.types";
import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/env";
export function createClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient<Database>(url, anonKey);
}
