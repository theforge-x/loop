import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QrCheckin } from "@/components/admin/qr-checkin";
import { ActionForm } from "@/components/admin/action-form";
import { weddingThemeStyle } from "@/lib/wedding/content";
import { lookupInvitation } from "@/app/admin/[weddingId]/check-in/actions";
vi.mock("@/app/admin/[weddingId]/check-in/actions", () => ({ lookupInvitation: vi.fn() }));
vi.mock("@/app/admin/[weddingId]/operations/actions", () => ({ operationAction: vi.fn() }));

describe("interface regressions", () => {
  it("recovers from a failed QR lookup and lets an operator retry", async () => {
    vi.mocked(lookupInvitation).mockRejectedValueOnce(new Error("Network offline")).mockResolvedValueOnce({ error: "Invitation expired." });
    render(<QrCheckin id="wedding" />);
    fireEvent.change(screen.getByLabelText("Invitation link or token"), { target: { value: "test-token" } });
    const submit = () => fireEvent.submit(screen.getByRole("button", { name: "Look up invitation" }).closest("form")!);
    submit();
    expect(await screen.findByRole("status")).toHaveTextContent("Check your connection and try again");
    expect(screen.getByRole("button", { name: "Look up invitation" })).toBeEnabled();
    submit();
    expect(await screen.findByText("Invitation expired.")).toBeVisible();
    expect(lookupInvitation).toHaveBeenCalledTimes(2);
  });

  it("shows a manual fallback when invitation copying is denied", async () => {
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("Denied")) } });
    render(<ActionForm action={async () => ({ message: "Invitation ready", invitationUrl: "https://example.test/invitation/private" })} label="Generate invitation"><input name="id" value="group" readOnly /></ActionForm>);
    fireEvent.submit(screen.getByRole("button", { name: "Generate invitation" }).closest("form")!);
    fireEvent.click(await screen.findByRole("button", { name: "Copy link" }));
    expect(await screen.findByText(/Select the invitation link above and copy it manually/)).toBeVisible();
    expect(screen.getByLabelText("Personal invitation link")).toHaveValue("https://example.test/invitation/private");
  });

  it("uses readable primary button text and matching surfaces for custom themes", () => {
    const light = weddingThemeStyle({ primary: "#ffffff" });
    const dark = weddingThemeStyle({ primary: "#000000", background: "#121212", foreground: "#f5f5f5" });
    expect(light).toHaveProperty("--wedding-primary-foreground", "#171c18");
    expect(dark).toHaveProperty("--wedding-primary-foreground", "#ffffff");
    expect(dark).toHaveProperty("--wedding-card", "#121212");
    expect(dark).toHaveProperty("--wedding-card-foreground", "#f5f5f5");
    expect(weddingThemeStyle({ accent: "#fafafa", background: "#ffffff" })).toHaveProperty("--wedding-accent-foreground", "#303b32");
  });
});
