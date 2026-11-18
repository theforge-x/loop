"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { limitRequest } from "@/lib/invitations/rate-limit";
export type RegistrationState = { message: string; error?: boolean } | null;
export async function signUp(_state: RegistrationState, form: FormData): Promise<RegistrationState> {
 const parsed=z.object({email:z.email().max(320).transform(v=>v.toLowerCase()),password:z.string().min(12).max(128),confirmation:z.string()}).refine(v=>v.password===v.confirmation).safeParse({email:form.get("email"),password:form.get("password"),confirmation:form.get("confirmation")});
 if(!parsed.success)return{error:true,message:"Enter a valid email and matching passwords of 12–128 characters."};
 try{await limitRequest("registration",parsed.data.email,5,3600);}catch{return{error:true,message:"Registration is temporarily unavailable. Please try again later."};}
 const client=await createClient();
 const {data,error}=await client.auth.signUp({email:parsed.data.email,password:parsed.data.password,options:{emailRedirectTo:new URL("/auth/confirm",process.env.NEXT_PUBLIC_APP_URL??"http://localhost:3000").toString()}});
 if(error)return{error:true,message:"We couldn’t create your account. Try again later, or sign in if you already have an account."};
 if(data.session)redirect("/admin/new");
 return{message:"Check your email for a confirmation link. After confirming, you can create your wedding. If you already have an account, sign in instead."};
}
