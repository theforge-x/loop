import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { GuestbookForm } from "@/components/wedding/guestbook-form";
import { ReserveGift } from "@/components/wedding/gift-controls";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
describe("guest workflow failure and confirmation feedback", () => {
 it("preserves a guestbook message when persistence fails and exposes an accessible error", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "Unable to save your message." }) }));
  render(<GuestbookForm slug="test-wedding" />);
  fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Ada" } });
  fireEvent.change(screen.getByLabelText("Your message"), { target: { value: "A message to keep" } });
  fireEvent.submit(screen.getByRole("button", { name: "Send your wishes" }).closest("form")!);
  expect(await screen.findByRole("alert")).toHaveTextContent("Unable to save your message.");
  expect(screen.getByLabelText("Your message")).toHaveValue("A message to keep");
  expect(screen.getByRole("button", { name: "Send your wishes" })).toBeEnabled();
 });
 it("confirms successful submission as pending moderation and clears the form only after persistence", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ saved: true }) }));
  render(<GuestbookForm slug="test-wedding" />);
  fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Ada" } });
  fireEvent.change(screen.getByLabelText("Your message"), { target: { value: "Wishes" } });
  fireEvent.submit(screen.getByRole("button", { name: "Send your wishes" }).closest("form")!);
  expect(await screen.findByRole("status")).toHaveTextContent("will appear after approval");
  expect(screen.getByLabelText("Your message")).toHaveValue("");
  expect(screen.queryByRole("blockquote")).not.toBeInTheDocument();
 });
 it("keeps a failed reservation retryable and reveals its private management link only after success", async () => {
  const fetcher = vi.fn().mockResolvedValueOnce({ ok: false, json: async () => ({ error: "Insufficient quantity" }) }).mockResolvedValueOnce({ ok: true, json: async () => ({ cancellation_url: "/gift-reservations/private-token" }) });
  vi.stubGlobal("fetch", fetcher); render(<ReserveGift slug="test-wedding" itemId="item" remaining={1} />);
  fireEvent.click(screen.getByRole("button", { name: "Reserve this gift" }));
  const submit = () => fireEvent.submit(screen.getByRole("button", { name: "Confirm reservation" }).closest("form")!);
  submit(); expect(await screen.findByRole("alert")).toHaveTextContent("Insufficient quantity");
  expect(screen.queryByRole("link", { name: /Manage your reservation/ })).not.toBeInTheDocument();
  submit(); expect(await screen.findByRole("link", { name: /Manage your reservation/ })).toHaveAttribute("href", "/gift-reservations/private-token");
  expect(screen.getByRole("status")).toHaveTextContent("Your gift is reserved");
 });
 it("does not offer an unavailable gift reservation", () => {
  render(<ReserveGift slug="test-wedding" itemId="item" remaining={0} />);
  expect(screen.getByRole("button", { name: "Fully reserved" })).toBeDisabled();
 });
});
