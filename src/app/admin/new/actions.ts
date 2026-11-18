"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { limitRequest } from "@/lib/invitations/rate-limit";
import type { ActionState } from "@/components/admin/action-form";
const reserved=new Set(["admin","api","auth","sign-in","sign-up","invitation","gift-reservations","robots","sitemap","favicon","icon"]);
export async function createWedding(_state:ActionState,form:FormData):Promise<ActionState>{
 const user=await requireUser();
 const parsed=z.object({p_slug:z.string().trim().min(3).max(80).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).refine(v=>!reserved.has(v)),p_title:z.string().trim().min(1).max(200),p_partner_one:z.string().trim().min(1).max(200),p_partner_two:z.string().trim().min(1).max(200)}).safeParse({p_slug:form.get("slug"),p_title:form.get("title"),p_partner_one:form.get("partner_one"),p_partner_two:form.get("partner_two")});
 if(!parsed.success)return{error:true,message:"Complete all fields. Choose a URL of 3–80 lowercase letters, numbers and single hyphens, avoiding reserved names such as admin."};
 try{await limitRequest("create-wedding",user.id,10,3600);}catch{return{error:true,message:"Wedding creation is temporarily unavailable. Please try again later."};}
 const client=await createClient();const {data,error}=await client.rpc("create_wedding",parsed.data);
 if(error)return{error:true,message:error.code==="23505"?"That wedding URL is already taken. Please choose another.":"We couldn’t create your wedding. Please try again."};
 redirect(`/admin/${data}/website`);
}
