/* eslint-disable @next/next/no-html-link-for-pages -- Error recovery must work when the client router cannot navigate. */
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return <main id="main-content" className="mx-auto max-w-lg px-6 py-24 text-center">
    <p className="mb-4 text-xs tracking-widest">404</p>
    <h1 className="text-5xl">A little out of the way.</h1>
    <p className="my-6 text-muted-foreground">We couldn’t find that page. Let’s get you back.</p>
    <Button asChild><a href="/">Back to Loop</a></Button>
  </main>;
}
