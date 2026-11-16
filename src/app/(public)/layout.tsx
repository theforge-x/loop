import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-dvh flex-col"><header className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-5 md:px-12"><Brand /><nav aria-label="Main navigation" className="flex items-center gap-3"><Link href="/#made-for-you" className="hidden px-3 py-2 text-xs text-muted-foreground hover:text-foreground sm:inline">Made for your day</Link><Button variant="outline" size="sm" asChild><Link href="/sign-in">Your workspace <span aria-hidden="true">↗</span></Link></Button><ThemeToggle /></nav></header><main id="main-content" className="flex-1">{children}</main><footer className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-xs text-muted-foreground md:px-12"><span>Made for the moments that matter.</span><span>With love, Loop.</span></footer></div>;
}
