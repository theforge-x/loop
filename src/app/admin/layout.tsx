import { ThemeToggle } from "@/components/theme-toggle";
import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { signOut } from "@/app/(auth)/sign-in/actions";
export const metadata: Metadata = { title: "Workspace", robots: { index: false, follow: false } };
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return <div className="admin-shell min-h-dvh bg-muted/40"><header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur-md"><div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-5 py-4 md:px-10"><div className="flex items-center gap-5"><Brand /><span className="hidden h-6 border-l sm:block" /><Link href="/admin" className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline">Wedding workspace</Link></div><div className="flex items-center gap-3"><ThemeToggle /><form action={signOut}><Button type="submit" variant="outline" size="sm">Sign out</Button></form></div></div></header><main id="main-content" className="mx-auto max-w-[1600px] px-5 py-8 md:px-10 md:py-10">{children}</main></div>;
}
