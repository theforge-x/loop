import type { Metadata } from "next";
import { SignInForm } from "./form";
export const metadata: Metadata = { title: "Welcome back", robots: { index: false, follow: false } };
export default function SignIn() {
  return <><p className="mb-4 text-xs tracking-[0.2em] uppercase text-muted-foreground">Your wedding workspace</p><h1 className="text-5xl">Welcome back.</h1><p className="mt-4 leading-7 text-muted-foreground">Sign in to bring the details together.</p><SignInForm /></>;
}
