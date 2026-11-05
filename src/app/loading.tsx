import { LoaderCircle } from "lucide-react";
export default function Loading() { return <div role="status" className="flex min-h-[60vh] items-center justify-center gap-3"><LoaderCircle aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none" /><span>Bringing things together…</span></div>; }
