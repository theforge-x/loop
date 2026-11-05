"use client";
import { useEffect, useState } from "react";
export function Countdown({ date }: { date: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const remaining = now === null ? null : Math.max(0, new Date(date).getTime() - now);
  if (remaining === 0) return <p className="font-serif text-3xl italic">A day to remember. A lifetime together.</p>;
  const values = remaining === null ? [null, null, null, null] : [Math.floor(remaining / 86400000), Math.floor(remaining / 3600000) % 24, Math.floor(remaining / 60000) % 60, Math.floor(remaining / 1000) % 60];
  return <div role="timer" aria-label="Time until the wedding" className="grid max-w-lg grid-cols-4 gap-3">{["Days", "Hours", "Minutes", "Seconds"].map((label, index) => <div key={label}><span className="block font-serif text-3xl tabular-nums sm:text-5xl">{values[index] === null ? "—" : String(values[index]).padStart(2, "0")}</span><span className="mt-3 block text-[10px] tracking-[0.15em] uppercase text-muted-foreground">{label}</span></div>)}</div>;
}
