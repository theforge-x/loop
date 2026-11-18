import { ThemeToggle } from "@/components/theme-toggle";
import { Brand } from "@/components/brand";
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh"><header className="flex items-center justify-between gap-4 px-6 py-8 md:px-12"><Brand /><ThemeToggle /></header><main id="main-content" className="mx-auto max-w-md px-6 py-12">{children}</main></div>;
}
