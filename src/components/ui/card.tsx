import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
export function Card({ className, ...props }: ComponentProps<"section">) {
  return <section className={cn("rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-[0_2px_8px_-4px_rgba(48,59,50,0.12)]", className)} {...props} />;
}
