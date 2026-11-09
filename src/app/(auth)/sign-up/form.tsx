"use client";
import { useActionState, useState } from "react";
import { signUp } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
export function RegistrationForm(){
 const [state,action,pending]=useActionState(signUp,null);
 const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [confirmation,setConfirmation]=useState("");
 return <form action={action} className="mt-8 space-y-6"><label className="block text-sm">Email address<Input name="email" value={email} onChange={event=>setEmail(event.target.value)} type="email" autoComplete="email" maxLength={320} required className="mt-2" /></label><label className="block text-sm">Password<Input name="password" value={password} onChange={event=>setPassword(event.target.value)} type="password" aria-describedby="password-hint" autoComplete="new-password" minLength={12} maxLength={128} required className="mt-2" /></label><p id="password-hint" className="-mt-4 text-xs text-muted-foreground">Use at least 12 characters.</p><label className="block text-sm">Confirm password<Input name="confirmation" value={confirmation} onChange={event=>setConfirmation(event.target.value)} type="password" autoComplete="new-password" minLength={12} maxLength={128} required className="mt-2" /></label>{state&&<p role={state.error?"alert":"status"} className="text-sm">{state.message}</p>}<Button type="submit" disabled={pending} className="w-full">{pending?"Creating account…":"Create account"}</Button></form>;
}
