"use client";
import { useActionState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
export type ActionState = { message: string; error?: boolean; invitationUrl?: string; qrDataUrl?: string } | null;
export function ActionForm({ action, children, label, className = "space-y-4" }: { action: (state: ActionState, data: FormData) => Promise<ActionState>; children: React.ReactNode; label: string; className?: string }) {
  const [state, formAction, pending] = useActionState(action, null);
  return <form action={formAction} className={className}>{children}<Button type="submit" disabled={pending} size="sm">{pending ? "Saving…" : label}</Button>{state && <p role={state.error ? "alert" : "status"} className={`text-sm leading-6 ${state.error ? "text-destructive" : "text-muted-foreground"}`}>{state.message}</p>}{state?.invitationUrl && <div className="space-y-3"><label className="block text-xs">Personal invitation link<input readOnly value={state.invitationUrl} onFocus={event => event.target.select()} className="mt-2 w-full rounded border bg-background p-3 text-xs" /></label><Button type="button" variant="outline" size="sm" onClick={() => navigator.clipboard?.writeText(state.invitationUrl!).catch(() => undefined)}>Copy link</Button>{state.qrDataUrl && <Image src={state.qrDataUrl} alt="Personal invitation QR code" width={200} height={200} unoptimized />}</div>}</form>;
}
