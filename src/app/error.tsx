"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="mx-auto max-w-lg px-6 py-24 text-center"><h1 className="text-4xl">Something went wrong.</h1><p className="my-6 text-muted-foreground">We couldn’t load this page. Please try again.</p><Button onClick={reset}>Try again</Button></div>;
}
