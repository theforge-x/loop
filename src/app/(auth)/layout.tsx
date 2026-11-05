import { Brand } from "@/components/brand";
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh"><header className="px-6 py-8 md:px-12"><Brand /></header><main id="main-content" className="mx-auto max-w-md px-6 py-12">{children}</main></div>;
}
