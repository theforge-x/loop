import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export async function GET(request:Request){
 const url=new URL(request.url);const client=await createClient();
 const code=url.searchParams.get("code");const hash=url.searchParams.get("token_hash");
 // Only signup confirmation is accepted. Redirect destinations are fixed, never supplied by the link.
 const result=hash&&url.searchParams.get("type")==="email"?await client.auth.verifyOtp({token_hash:hash,type:"email"}):code?await client.auth.exchangeCodeForSession(code):null;
 const response=NextResponse.redirect(new URL(result&&!result.error?"/admin/new":"/sign-up?confirmation=failed",process.env.NEXT_PUBLIC_APP_URL??url.origin));
 response.headers.set("Cache-Control","private, no-store");response.headers.set("Referrer-Policy","no-referrer");return response;
}
