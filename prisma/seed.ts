import "dotenv/config";
import { db } from "../src/lib/db";
import { sampleWedding } from "../src/services/content";
import { createInvitation } from "../src/services/guests";
import { hashPassword } from "../src/lib/security";
import { z } from "zod";

async function main() {
  const demo = process.env.SEED_DEMO === "true";
  const input = { ...sampleWedding };
  await db.weddingSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1, draft: input, published: input } });
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email && !password) {
    console.log("Sample wedding is ready. Set ADMIN_EMAIL and ADMIN_PASSWORD to create an administrator.");
    return;
  }
  if (!z.email().safeParse(email).success || !email || !password || password.length < 14 || password.length > 128) {
    throw new Error("Set a valid ADMIN_EMAIL and an ADMIN_PASSWORD between 14 and 128 characters.");
  }
  const passwordHash = await hashPassword(password);
  const admin = await db.$transaction(async tx => {
    const account = await tx.admin.upsert({ where: { email }, update: { passwordHash }, create: { email, passwordHash } });
    await tx.adminSession.deleteMany({ where: { adminId: account.id } });
    return account;
  });
  if (!demo) return;
  if (!(await db.invitation.count())) {
    const code = await createInvitation({ label: "The Johnson family", names: ["Jordan Johnson", "Taylor Johnson", "David Johnson"], deadline: null, disabled: false }, admin.id);
    console.log("Demo invitation code (shown once):", code);
  }
  if (!(await db.wishlistItem.count())) await db.wishlistItem.createMany({ data: [
    { name: "Dinnerware set", description: "A simple stoneware set for dinners at home.", image: "/images/wedding-table.jpg", price: "₦65,000" },
    { name: "Weekend getaway fund", description: "A contribution towards our first trip together after the wedding.", image: "", price: "" },
  ] });
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
