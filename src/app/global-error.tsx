"use client";
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="en"><body><main style={{ maxWidth: 480, margin: "15vh auto", padding: 24, fontFamily: "sans-serif" }}><h1>Something went wrong.</h1><p>Please try loading the page again.</p><button onClick={reset}>Try again</button></main></body></html>;
}
