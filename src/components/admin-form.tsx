"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";

export type ActionState = { error?: string; success?: string; code?: string };
type Action = (previous: ActionState, fields: FormData) => Promise<ActionState>;

export function AdminForm({ action, children, className, resetOnSuccess = false }: { action: Action; children: React.ReactNode; className?: string; resetOnSuccess?: boolean }) {
  const [state, submit, pending] = useActionState(action, {});
  const [copiedCode, setCopiedCode] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!state.success || !formRef.current) return;
    if (resetOnSuccess) formRef.current.reset();
    for (const input of formRef.current.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input[type="file"], [data-clear-on-save]')) {
      input.value = "";
    }
  }, [state, resetOnSuccess]);
  return <form ref={formRef} action={submit} className={className} onSubmit={event => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget, (event.nativeEvent as SubmitEvent).submitter);
    startTransition(() => submit(fields));
  }}>
    <fieldset className="admin-fieldset" disabled={pending}>{children}</fieldset>
    {state.error && <p className="form-error" role="alert">{state.error}</p>}
    {state.success && <p className="success-text" role="status">{state.success}</p>}
    {state.code && <div className="admin-code">
      <p>Copy this code now. Loop displays it once.</p>
      <output>{state.code}</output>
      <button type="button" className="button button-outline" onClick={async () => {
        try { await navigator.clipboard.writeText(state.code!); setCopiedCode(state.code!); }
        catch { setCopiedCode(""); }
      }}>{copiedCode === state.code ? "Copied" : "Copy code"}</button>
    </div>}
  </form>;
}
