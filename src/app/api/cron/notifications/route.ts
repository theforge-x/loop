import { z } from "zod";
import { createHash, timingSafeEqual } from "node:crypto";
import { createTrustedClient } from "@/lib/supabase/admin";
import { deliverNotification } from "@/lib/email/outbox";
import { privateJson } from "@/lib/http";
export const maxDuration = 300;
export async function GET(request: Request) {
 const secret = process.env.CRON_SECRET; if (!secret || secret.length < 32) return privateJson({ error: "Worker authentication is not configured." }, 503);
 const actual = createHash("sha256").update(request.headers.get("authorization") ?? "").digest(); const expected = createHash("sha256").update(`Bearer ${secret}`).digest();
 if (!timingSafeEqual(actual, expected)) return privateJson({ error: "Unauthorized." }, 401);
 const client = createTrustedClient(); const now = new Date().toISOString();
 const weddingId = new URL(request.url).searchParams.get("wedding_id"); if (weddingId && !z.uuid().safeParse(weddingId).success) return privateJson({ error: "Invalid wedding ID." }, 400);
 let query = client.from("notifications").select("id").lt("attempts", 8).or(`and(status.in.(pending,failed),next_attempt_at.lte.${now}),and(status.eq.processing,lease_expires_at.lt.${now})`).order("next_attempt_at").limit(10);
 if (weddingId) query = query.eq("wedding_id", weddingId);
 const jobs = await query;
 if (jobs.error) return privateJson({ error: "Unable to load due notifications." }, 503);
 for (const job of jobs.data) { await deliverNotification(job.id); await new Promise(resolve => setTimeout(resolve, 600)); }
 const pruned = await client.rpc("prune_request_limits"); if (pruned.error) return privateJson({ error: "Unable to complete worker maintenance." }, 503);
 return privateJson({ inspected: jobs.data.length, expired_limits_removed: pruned.data });
}
