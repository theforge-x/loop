import { expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PhotoGallery } from "@/components/wedding/gallery";
vi.mock("next/image", () => ({ default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} /> }));
it("opens any photo, navigates with the keyboard, and restores focus to its opener", async () => {
  render(<PhotoGallery photos={[
    { id: "one", src: "/one.png", alt: "First photo", caption: null },
    { id: "two", src: "/two.png", alt: "Second photo", caption: null },
  ]} />);
  const first = screen.getByRole("button", { name: "Open photograph: First photo" });
  fireEvent.click(first);
  let dialog = await screen.findByRole("dialog");
  expect(dialog).toHaveAccessibleName("First photo");
  fireEvent.keyDown(dialog, { key: "ArrowRight" });
  expect(dialog).toHaveAccessibleName("Second photo");
  fireEvent.click(screen.getByRole("button", { name: "Close photograph" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  await waitFor(() => expect(first).toHaveFocus());
  fireEvent.click(screen.getByRole("button", { name: "Open photograph: Second photo" }));
  dialog = await screen.findByRole("dialog");
  expect(dialog).toHaveAccessibleName("Second photo");
  fireEvent.keyDown(dialog, { key: "ArrowLeft" });
  expect(dialog).toHaveAccessibleName("First photo");
});
