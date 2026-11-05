"use client";
import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
export function FadeIn({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  return <motion.div initial={false} animate={{ opacity: 1, y: 0 }} whileInView={reduced ? undefined : { y: [8, 0] }} viewport={{ once: true }} transition={{ duration: 0.5 }}>{children}</motion.div>;
}
