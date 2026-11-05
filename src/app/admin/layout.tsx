import type { Metadata } from "next";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { signOut } from "@/app/(auth)/sign-in/actions";
export const metadata: Metadata = { title: "Workspace", robots: { index: false, follow: false } };
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return <div className="min-h-dvh bg-muted/40"><header className="flex items-center justify-between gap-4 border-b bg-card px-6 py-5 md:px-10"><Brand /><div className="flex items-center gap-6"><span className="hidden text-sm text-muted-foreground sm:inline">Wedding workspace</span><form action={signOut}><Button type="submit" variant="outline" size="sm">Sign out</Button></form></div></header><main id="main-content" className="mx-auto max-w-6xl px-6 py-12 md:px-10">{children}</main></div>;
}
