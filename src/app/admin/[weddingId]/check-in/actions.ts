"use server";
import { z } from "zod";
import { requireGuestOperator } from "@/lib/workspace";
import { limitRequest } from "@/lib/invitations/rate-limit";
import { unstable_rethrow } from "next/navigation";
const resultSchema=z.object({group_name:z.string(),attendees:z.array(z.object({id:z.uuid(),name:z.string(),events:z.array(z.object({id:z.uuid(),title:z.string(),checked_in:z.boolean()}))}))});
export type CheckinResult=z.infer<typeof resultSchema>;
export async function lookupInvitation(id:string,value:string):Promise<{data?:CheckinResult;error?:string}>{
 try{const {client,user}=await requireGuestOperator(id);await limitRequest("qr-lookup",user.id,60,60);let token=value.trim();if(token.startsWith("https://")||token.startsWith("http://")){const url=new URL(token);const parts=url.pathname.split("/");if(parts.length!==3||parts[1]!=="invitation")throw new Error("Use a personal invitation QR code.");token=parts[2];}z.string().regex(/^[A-Za-z0-9_-]{43,256}$/).parse(token);const result=await client.rpc("lookup_checkin",{p_wedding_id:id,p_token:token});if(result.error)throw new Error("Invitation invalid, expired, revoked or from another wedding.");return{data:resultSchema.parse(result.data)};}catch(error){unstable_rethrow(error);return{error:error instanceof z.ZodError?"Use a valid invitation link or token.":error instanceof Error?error.message:"Unable to look up invitation."};}
}
