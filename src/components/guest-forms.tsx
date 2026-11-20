"use client";

import { CheckCircle2, Gift, KeyRound, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Invitation = { label: string; guests: { id: string; name: string }[]; attending: string[] | null };
type Result = { reference: string; confirmation?: string; status?: "ACCEPTED" | "PARTIAL" | "DECLINED" };

async function request<T>(operation: string, data: object): Promise<T> {
  const response = await fetch("/api/guest/" + operation, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Something went wrong. Please try again.");
  return result;
}

function Failure({ message }: { message: string }) {
  return message ? <p className="form-error" role="alert">{message}</p> : null;
}

function Confirmation({ result, children }: { result: Result; children: React.ReactNode }) {
  return <div className="confirmation" role="status">
    <CheckCircle2 size={27} />
    <strong>{children}</strong>
    {result.status && <span>{{ ACCEPTED: "Accepted", PARTIAL: "Partially attending", DECLINED: "Declined" }[result.status]}</span>}
    <small>Reference <b>{result.reference}</b></small>
  </div>;
}

function Submit({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return <button className="button" disabled={pending}>{pending && <LoaderCircle className="spin" size={16} />}{children}</button>;
}

export function RsvpForm() {
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [group, setGroup] = useState<Invitation>();
  const [selected, setSelected] = useState<string[]>([]);
  const [decision, setDecision] = useState<"attend" | "decline" | "">("");
  const [result, setResult] = useState<Result>();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      if (!group) {
        const invitation = await request<Invitation>("verify", { code });
        setGroup(invitation);
        setSelected(invitation.attending ?? []);
        setDecision(invitation.attending === null ? "" : invitation.attending.length ? "attend" : "decline");
      } else {
        if (decision === "attend" && !selected.length) throw new Error("Select at least one guest who will attend.");
        if (!decision) throw new Error("Choose whether anyone will attend.");
        setResult(await request<Result>("rsvp", { code, attending: decision === "decline" ? [] : selected, phone, message }));
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Please try again.");
    } finally { setPending(false); }
  }

  function reset() {
    setGroup(undefined);
    setResult(undefined);
    setCode("");
    setPhone("");
    setMessage("");
    setError("");
  }

  if (result) return <div className="guest-form">
    <Confirmation result={result}>{result.confirmation}</Confirmation>
    <button type="button" className="text-button" onClick={() => setResult(undefined)}>Edit my response</button>
    <button type="button" className="text-button" onClick={reset}>Use another code</button>
  </div>;

  return <form className="guest-form" onSubmit={submit}>
    {!group ? <>
      <label htmlFor="invite-code">Invitation code</label>
      <div className="code-input"><KeyRound size={17} aria-hidden /><input id="invite-code" value={code} onChange={event => setCode(event.target.value)} placeholder="Enter your code" autoCapitalize="characters" autoComplete="off" spellCheck={false} maxLength={40} required /></div>
      <Submit pending={pending}>Find my invitation</Submit>
    </> : <>
      <h3>{group.label}</h3>
      <fieldset className="choice-list"><legend>Will anyone attend?</legend>
        <label><input type="radio" name="decision" checked={decision === "attend"} onChange={() => setDecision("attend")} required /> Yes, we’ll be there</label>
        <label><input type="radio" name="decision" checked={decision === "decline"} onChange={() => setDecision("decline")} required /> No, we’ll miss it</label>
      </fieldset>
      {decision === "attend" && <fieldset className="choice-list"><legend>Who will attend?</legend>
        {group.guests.map(guest => <label key={guest.id}><input type="checkbox" checked={selected.includes(guest.id)} onChange={event => setSelected(current => event.target.checked ? [...current, guest.id] : current.filter(id => id !== guest.id))} /> {guest.name}</label>)}
      </fieldset>}
      <label>Phone number<input name="phone" type="tel" autoComplete="tel" value={phone} onChange={event => setPhone(event.target.value)} required maxLength={40} /></label>
      <label>Message <span>(optional)</span><textarea name="message" rows={3} maxLength={1500} value={message} onChange={event => setMessage(event.target.value)} /></label>
      <Submit pending={pending}>Send my RSVP</Submit>
      <button type="button" className="text-button" onClick={reset} disabled={pending}>Use another code</button>
    </>}
    <Failure message={error} />
  </form>;
}

export function ReserveGift({ itemId, name, available }: { itemId: string; name: string; available: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<Result>();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      setResult(await request<Result>("reserve", { itemId, guestName: fields.get("guestName"), contact: fields.get("contact"), message: fields.get("message") }));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Please try again.");
    } finally {
      router.refresh();
      setPending(false);
    }
  }

  if (result) return <Confirmation result={result}>Your gift reservation is saved</Confirmation>;
  if (open) return <form className="reserve-form" onSubmit={submit}>
    <Failure message={error} />
    {available && <>
      <label>Your name<input name="guestName" autoComplete="name" maxLength={120} required /></label>
      <label>Contact <span>(optional)</span><input name="contact" maxLength={120} /></label>
      <label>Message <span>(optional)</span><textarea name="message" rows={2} maxLength={1500} /></label>
      <Submit pending={pending}>Confirm reservation</Submit>
    </>}
    <button type="button" className="text-button" onClick={() => { setOpen(false); setError(""); }} disabled={pending}>{available ? "Cancel" : "Close"}</button>
  </form>;
  return available ? <button className="button button-outline" type="button" onClick={() => setOpen(true)} aria-label={"Reserve " + name}><Gift size={17} /> Reserve gift</button> : null;
}
