import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RegistrationForm } from "./form";
export const metadata:Metadata={title:"Create your account",robots:{index:false,follow:false}};
export default async function SignUp({searchParams}:{searchParams:Promise<{confirmation?:string}>}){
 const client=await createClient();const {data:{user}}=await client.auth.getUser();if(user)redirect("/admin");
 const query=await searchParams;
 return <><p className="mb-4 text-xs tracking-[0.2em] uppercase text-muted-foreground">Your wedding starts here</p><h1 className="text-5xl">Make it yours.</h1><p className="mt-4 leading-7 text-muted-foreground">Create your account, then set up your wedding website and workspace.</p>{query.confirmation==="failed"&&<p role="alert" className="mt-6 text-sm text-destructive">This confirmation link is invalid or has expired. Try signing in, or register again if you haven’t confirmed your account.</p>}<RegistrationForm /><p className="mt-6 text-sm">Already have an account? <Link href="/sign-in" className="underline">Sign in</Link></p></>;
}
