"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getColorMode, setColorMode, subscribeColorMode, type ColorMode } from "@/lib/theme";
const serverColorMode = (): ColorMode => "light";

export function ThemeToggle() {
  const mode = useSyncExternalStore(subscribeColorMode, getColorMode, serverColorMode);
  const dark = mode === "dark";
  return <Button type="button" variant="outline" size="icon" className="size-10 shrink-0" aria-label="Dark mode" aria-pressed={dark} title={dark ? "Switch to light mode" : "Switch to dark mode"} onClick={() => setColorMode(dark ? "light" : "dark")}>{dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}</Button>;
}
