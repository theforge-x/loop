import { z } from "zod";
const schema = z.object({
  url: z.url(),
  anonKey: z.string().min(1),
});
export function getSupabaseEnv() {
  const result = schema.safeParse({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  if (!result.success) throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local; see README.md.");
  return result.data;
}
