import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { WeddingForm } from "./form";
export default async function NewWedding(){
 await requireUser();
 return <div className="max-w-xl"><p className="mb-4 text-xs tracking-[0.2em] uppercase text-muted-foreground">A new beginning</p><h1 className="text-4xl">Create your wedding</h1><p className="my-6 leading-7 text-muted-foreground">Start with the essentials. Your website stays private until you preview and publish it.</p><WeddingForm /><Link href="/admin" className="mt-6 inline-block text-sm underline">Back to your workspaces</Link></div>;
}
