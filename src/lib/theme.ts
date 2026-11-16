export type ColorMode = "light" | "dark";
export const themeStorageKey = "loop-theme";
export const themeChangeEvent = "loop-theme-change";

// Runs before paint so a saved dark preference does not flash a light page.
export const themeInitScript = `(function(){try{var stored=localStorage.getItem("loop-theme");var mode=stored==="light"||stored==="dark"?stored:(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.dataset.theme=mode}catch(e){document.documentElement.dataset.theme=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}})();`;

export function getColorMode(): ColorMode {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}
export function setColorMode(mode: ColorMode) {
  document.documentElement.dataset.theme = mode;
  try { localStorage.setItem(themeStorageKey, mode); } catch { /* Keep the toggle usable when browser storage is blocked. */ }
  window.dispatchEvent(new Event(themeChangeEvent));
}
export function subscribeColorMode(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const syncPreference = () => {
    let stored: string | null = null;
    try { stored = localStorage.getItem(themeStorageKey); } catch { /* Use the device preference. */ }
    document.documentElement.dataset.theme = stored === "light" || stored === "dark" ? stored : media.matches ? "dark" : "light";
    onChange();
  };
  const storageChange = (event: StorageEvent) => {
    if (event.key === themeStorageKey || event.key === null) syncPreference();
  };
  window.addEventListener(themeChangeEvent, onChange);
  window.addEventListener("storage", storageChange);
  media.addEventListener("change", syncPreference);
  return () => {
    window.removeEventListener(themeChangeEvent, onChange);
    window.removeEventListener("storage", storageChange);
    media.removeEventListener("change", syncPreference);
  };
}
