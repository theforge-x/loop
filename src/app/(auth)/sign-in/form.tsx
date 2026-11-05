"use client";
import { useActionState } from "react";
import { signIn } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export function SignInForm() {
  const [state, action, pending] = useActionState(signIn, null);
  return <form action={action} className="mt-8 space-y-6"><div><label htmlFor="email" className="mb-2 block text-sm">Email address</label><Input id="email" name="email" type="email" autoComplete="email" required /></div><div><label htmlFor="password" className="mb-2 block text-sm">Password</label><Input id="password" name="password" type="password" autoComplete="current-password" maxLength={256} required /></div>{state?.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}<Button type="submit" disabled={pending} className="w-full">{pending ? "Signing in…" : "Sign in"}</Button></form>;
}
