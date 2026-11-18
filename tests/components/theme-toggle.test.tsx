import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { ThemeToggle } from "@/components/theme-toggle";
import { themeInitScript, themeStorageKey } from "@/lib/theme";

let media: EventTarget & { matches: boolean };
let preferences: Map<string, string>;
beforeEach(() => {
  delete document.documentElement.dataset.theme;
  media = Object.assign(new EventTarget(), { matches: false });
  preferences = new Map();
  vi.stubGlobal("matchMedia", vi.fn(() => media));
  vi.stubGlobal("localStorage", {
    getItem: vi.fn((key: string) => preferences.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => preferences.set(key, value)),
  });
});
afterEach(() => { delete document.documentElement.dataset.theme; });
const initialize = () => new Function(themeInitScript)();

describe("color mode preference", () => {
  it("uses the device preference before rendering when nothing has been saved", () => {
    media.matches = true;
    initialize();
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
  it("restores an explicit preference ahead of the device preference", () => {
    media.matches = true;
    preferences.set(themeStorageKey, "light");
    initialize();
    expect(document.documentElement.dataset.theme).toBe("light");
  });
  it("toggles both ways, persists the choice and keeps multiple controls synchronized", () => {
    initialize();
    render(<><ThemeToggle /><ThemeToggle /></>);
    const buttons = screen.getAllByRole("button", { name: "Dark mode" });
    fireEvent.click(buttons[0]);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(preferences.get(themeStorageKey)).toBe("dark");
    buttons.forEach(button => expect(button).toHaveAttribute("aria-pressed", "true"));
    fireEvent.click(buttons[1]);
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(preferences.get(themeStorageKey)).toBe("light");
    buttons.forEach(button => expect(button).toHaveAttribute("aria-pressed", "false"));
  });
  it("follows device changes until the visitor saves an explicit choice", () => {
    initialize();
    render(<ThemeToggle />);
    act(() => { media.matches = true; media.dispatchEvent(new Event("change")); });
    expect(document.documentElement.dataset.theme).toBe("dark");
    fireEvent.click(screen.getByRole("button", { name: "Dark mode" }));
    act(() => { media.dispatchEvent(new Event("change")); });
    expect(document.documentElement.dataset.theme).toBe("light");
  });
  it("synchronizes another tab's saved preference", () => {
    initialize();
    render(<ThemeToggle />);
    preferences.set(themeStorageKey, "dark");
    act(() => { window.dispatchEvent(new StorageEvent("storage", { key: themeStorageKey, newValue: "dark" })); });
    expect(screen.getByRole("button", { name: "Dark mode" })).toHaveAttribute("aria-pressed", "true");
  });
  it("still initializes and toggles when storage is blocked", () => {
    vi.mocked(localStorage.getItem).mockImplementation(() => { throw new Error("Blocked"); });
    vi.mocked(localStorage.setItem).mockImplementation(() => { throw new Error("Blocked"); });
    media.matches = true;
    initialize();
    render(<ThemeToggle />);
    expect(document.documentElement.dataset.theme).toBe("dark");
    fireEvent.click(screen.getByRole("button", { name: "Dark mode" }));
    expect(document.documentElement.dataset.theme).toBe("light");
  });
});
