"use client";
import { useState } from "react";
import { ActionForm } from "@/components/admin/action-form";
import { Input } from "@/components/ui/input";
import { createWedding } from "./actions";
export function WeddingForm(){
 const [values,setValues]=useState({title:"",partner_one:"",partner_two:"",slug:""});
 const fields=[{name:"title",label:"Workspace title",placeholder:"Ada & Tunde’s wedding"},{name:"partner_one",label:"First partner’s name"},{name:"partner_two",label:"Second partner’s name"},{name:"slug",label:"Wedding URL",placeholder:"ada-and-tunde"}] as const;
 return <ActionForm action={createWedding} label="Create wedding">{fields.map(field=><label key={field.name} className="block text-sm">{field.label}<Input name={field.name} value={values[field.name]} onChange={event=>setValues(current=>({...current,[field.name]:event.target.value}))} required maxLength={field.name==="slug"?80:200} minLength={field.name==="slug"?3:1} pattern={field.name==="slug"?"[a-z0-9]+(-[a-z0-9]+)*":undefined} placeholder={'placeholder' in field?field.placeholder:undefined} autoComplete="off" autoCapitalize={field.name==="slug"?"none":undefined} spellCheck={field.name==="slug"?false:undefined} aria-describedby={field.name==="slug"?"slug-hint":undefined} className="mt-2" /></label>)}<p id="slug-hint" className="text-xs text-muted-foreground">Your public address will be /your-wedding-url. Use lowercase letters, numbers and hyphens.</p></ActionForm>;
}
