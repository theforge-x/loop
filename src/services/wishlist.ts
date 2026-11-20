import { db } from "../lib/db";
import { reference } from "../lib/security";
import { UserError, type giftReservation } from "../lib/validation";
import type { z } from "zod";
import { getWedding } from "./content";

export async function publicGifts() {
  return db.wishlistItem.findMany({
    where: { hidden: false, archived: false },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, description: true, image: true, price: true, status: true },
  });
}

export async function reserveGift(data: z.infer<typeof giftReservation>) {
  const wedding = await getWedding();
  if (!wedding?.wishlist.visible) throw new UserError("Gift reservations are currently closed.");
  return db.$transaction(async tx => {
    const claimed = await tx.wishlistItem.updateMany({
      where: { id: data.itemId, status: "AVAILABLE", hidden: false, archived: false },
      data: { status: "RESERVED" },
    });
    if (claimed.count !== 1) throw new UserError("This gift is no longer available. Please choose another.");
    return tx.giftReservation.create({ data: { ...data, activeItemId: data.itemId, reference: reference("GIFT") }, select: { reference: true } });
  });
}

export async function changeReservation(itemId: string, reservationId: string, action: "confirm" | "cancel" | "receive", adminId: string) {
  await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM wishlist_items WHERE id = ${itemId} FOR UPDATE`;
    const gift = await tx.wishlistItem.findUnique({ where: { id: itemId } });
    const current = await tx.giftReservation.findUnique({ where: { activeItemId: itemId } });
    if (!gift || current?.id !== reservationId || gift.status !== "RESERVED" || (action === "confirm" && current.status !== "RESERVED")) {
      throw new UserError("This reservation has already changed. Reload the page and try again.");
    }

    const state = { confirm: "CONFIRMED", cancel: "CANCELLED", receive: "RECEIVED" } as const;
    await tx.giftReservation.update({
      where: { id: current.id }, data: { status: state[action], activeItemId: action === "cancel" ? null : itemId },
    });
    if (action !== "confirm") await tx.wishlistItem.update({ where: { id: itemId }, data: { status: action === "cancel" ? "AVAILABLE" : "RECEIVED" } });
    await tx.audit.create({ data: { adminId, action: state[action] + " gift reservation", subject: current.reference } });
  });
}
