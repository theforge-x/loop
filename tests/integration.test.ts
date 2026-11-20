import "dotenv/config";
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { PrismaClient } from "@prisma/client";
import { db } from "../src/lib/db";
import { allowAttempt, codeHash, hashPassword, verifyPassword } from "../src/lib/security";
import { saveImage } from "../src/lib/media";
import { getWedding, publishDraft, sampleWedding, saveDraftSection } from "../src/services/content";
import { createInvitation, editInvitation, regenerateCode } from "../src/services/guests";
import { overrideRsvp, submitRsvp, verifyInvitation } from "../src/services/rsvp";
import { changeReservation, publicGifts, reserveGift } from "../src/services/wishlist";
import sharp from "sharp";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

if (!process.env.DATABASE_URL || !/^\/loop_test\w*$/.test(new URL(process.env.DATABASE_URL).pathname)) {
  throw new Error("Point DATABASE_URL at a dedicated empty database named loop_test before running integration tests.");
}
after(() => db.$disconnect());
const actor = "integration-test";

test("MySQL invitation, RSVP, registry, and content persistence", async context => {
  const wedding = { ...sampleWedding, rsvp: { ...sampleWedding.rsvp, deadline: "" } };
  await db.weddingSettings.create({ data: { id: 1, draft: wedding, published: wedding } });
  const input = { label: "Integration household", names: ["Amina", "Chidi", "Femi"], disabled: false, deadline: null };
  const code = await createInvitation(input, actor);
  const invite = await db.invitation.findUniqueOrThrow({ where: { codeHash: codeHash(code) } });
  const otherCode = await createInvitation({ ...input, label: "Other household", names: ["Ade"] }, actor);
  const other = await verifyInvitation(otherCode);
  const { guests } = await verifyInvitation(code.toLowerCase());
  const [first, second, third] = guests.map(guest => guest.id);
  const contact = { phone: "+234 801 234 5678", message: "Thank you!" };

  await context.test("verifies only assigned guests and rejects an invalid code", async () => {
    assert.match(code, /^(?:[A-F\d]{6}-){3}[A-F\d]{6}$/);
    assert.equal(invite.codeHash, codeHash(code));
    assert.notEqual(invite.codeHash, code);
    assert.deepEqual(guests.map(person => person.name), input.names);
    await assert.rejects(verifyInvitation("XXXXXX-XXXXXX-XXXXXX-XXXXXX"), /couldn’t find an active invitation/);
    await assert.rejects(submitRsvp(code, { ...contact, attending: [other.guests[0].id] }), /Choose only guests/);
    await assert.rejects(submitRsvp(code, { ...contact, attending: [first, first] }), /Choose only guests/);
    await db.invitation.update({ where: { id: invite.id }, data: { guestLimit: 1 } });
    await assert.rejects(submitRsvp(code, { ...contact, attending: [first, second] }), /Choose only guests/);
    await db.invitation.update({ where: { id: invite.id }, data: { guestLimit: 3 } });
  });

  await context.test("creates accepted, declined, partial and audited admin updates on one RSVP", async () => {
    const firstReply = await submitRsvp(code, { ...contact, attending: [first, second, third] });
    assert.equal(firstReply.status, "ACCEPTED");
    const declined = await submitRsvp(code, { ...contact, attending: [] });
    assert.equal(declined.status, "DECLINED");
    const partial = await submitRsvp(code, { ...contact, attending: [first] });
    assert.deepEqual([partial.status, partial.reference], ["PARTIAL", firstReply.reference]);
    const adminReply = await overrideRsvp(invite.id, { ...contact, attending: [first, second] }, actor);
    assert.equal(adminReply.reference, firstReply.reference);
    assert.equal(await db.rsvp.count({ where: { invitationId: invite.id } }), 1);
    const revisions = await db.rsvpHistory.findMany({ where: { rsvpId: adminReply.id }, orderBy: { createdAt: "asc" } });
    assert.equal(revisions.length, 4);
    assert.equal(revisions.at(-1)?.actor, "admin:" + actor);
    assert.deepEqual((await verifyInvitation(code)).attending?.sort(), [first, second].sort());
    assert.equal("phone" in await verifyInvitation(code), false);
    assert.equal(await db.audit.count({ where: { action: "Corrected RSVP" } }), 1);
  });

  await context.test("edits the named list, applies deadlines and rotates or disables a code", async () => {
    await editInvitation(invite.id, { ...input, names: ["New guest"], deadline: new Date("2000-01-01") }, [
      { id: first, name: "Amina A." }, { id: second, name: "" }, { id: third, name: "Femi" },
    ], actor);
    await assert.rejects(verifyInvitation(code), /Replies have closed/);
    await assert.rejects(submitRsvp(code, { ...contact, attending: [first] }), /Replies have closed/);
    const published = { ...sampleWedding, rsvp: { ...sampleWedding.rsvp, allowLate: true } };
    await db.weddingSettings.update({ where: { id: 1 }, data: { published } });
    const rotated = await regenerateCode(invite.id, actor);
    await assert.rejects(verifyInvitation(code), /couldn’t find an active invitation/);
    const amended = await verifyInvitation(rotated);
    assert.deepEqual(amended.guests.map(guest => guest.name), ["Amina A.", "Femi", "New guest"]);
    assert.deepEqual(amended.attending, [first]);
    await db.invitation.update({ where: { id: invite.id }, data: { disabled: true } });
    await assert.rejects(verifyInvitation(rotated), /couldn’t find an active invitation/);
  });

  await context.test("allows one concurrent reservation, protects private data and supports admin transitions", async () => {
    const item = await db.wishlistItem.create({ data: { name: "A kettle", description: "A gift", price: "", image: "" } });
    const payload = { itemId: item.id, guestName: "Guest name", contact: "private phone", message: "private message" };
    const outcomes = await Promise.allSettled([reserveGift(payload), reserveGift({ ...payload, guestName: "Second guest" })]);
    assert.equal(outcomes.filter(outcome => outcome.status === "fulfilled").length, 1);
    const failed = outcomes.find(outcome => outcome.status === "rejected");
    assert.match(String(failed && failed.reason), /no longer available/);
    const current = await db.giftReservation.findUniqueOrThrow({ where: { activeItemId: item.id } });
    assert.equal(await db.giftReservation.count({ where: { itemId: item.id } }), 1);
    const encoded = JSON.stringify(await publicGifts());
    assert.match(encoded, /RESERVED/);
    assert.doesNotMatch(encoded, /private phone|private message|Second guest|Guest name/);

    await changeReservation(item.id, current.id, "confirm", actor);
    assert.equal((await db.giftReservation.findUniqueOrThrow({ where: { id: current.id } })).status, "CONFIRMED");
    await changeReservation(item.id, current.id, "cancel", actor);
    const next = await reserveGift(payload);
    const latest = await db.giftReservation.findUniqueOrThrow({ where: { reference: next.reference } });
    await assert.rejects(changeReservation(item.id, current.id, "cancel", actor), /already changed/);
    await changeReservation(item.id, latest.id, "receive", actor);
    await assert.rejects(reserveGift(payload), /no longer available/);
    assert.equal((await db.wishlistItem.findUniqueOrThrow({ where: { id: item.id } })).status, "RECEIVED");
  });

  await context.test("keeps drafts private and persists RSVP and gifts across a database reconnection", async () => {
    await Promise.all([
      saveDraftSection("hero", { ...sampleWedding.hero, firstName: "Edited draft" }, actor),
      saveDraftSection("story", { ...sampleWedding.story, heading: "Updated story" }, actor),
    ]);
    assert.notEqual((await getWedding())?.hero.firstName, "Edited draft");
    const draft = await getWedding(true);
    assert.equal(draft?.hero.firstName, "Edited draft");
    assert.equal(draft?.story.heading, "Updated story");
    await publishDraft(actor);
    assert.deepEqual(await getWedding(), draft);
    const separateClient = new PrismaClient();
    try {
      assert.equal(await separateClient.rsvp.count({ where: { invitationId: invite.id } }), 1);
      assert.equal(await separateClient.giftReservation.count({ where: { status: "RECEIVED" } }), 1);
    } finally { await separateClient.$disconnect(); }
  });
});

test("password hashing and database-backed rate limits", async () => {
  const password = "this is only a test password";
  const hash = await hashPassword(password);
  assert.notEqual(hash, password);
  assert.equal(await verifyPassword(password, hash), true);
  assert.equal(await verifyPassword("wrong", hash), false);
  const scope = "test-" + Date.now();
  const attempts = await Promise.all(Array.from({ length: 6 }, () => allowAttempt(scope, "test", 3)));
  assert.equal(attempts.filter(Boolean).length, 3);
});

test("validates image contents and writes processed uploads", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "loop-upload-test-"));
  const previous = process.env.UPLOAD_DIR;
  process.env.UPLOAD_DIR = directory;
  try {
    const bytes = await sharp({ create: { width: 12, height: 12, channels: 3, background: "#9bba80" } }).png().toBuffer();
    const image = await saveImage(new File([new Uint8Array(bytes)], "image.png", { type: "image/png" }));
    assert.match(image, /^\/media\/[\da-f-]{36}\.webp$/);
    const uploaded = await readFile(path.join(directory, path.basename(image)));
    assert.equal((await sharp(uploaded).metadata()).format, "webp");
    await assert.rejects(saveImage(new File(["not a png"], "fake.png", { type: "image/png" })), /could not be read/);
  } finally {
    if (previous === undefined) delete process.env.UPLOAD_DIR;
    else process.env.UPLOAD_DIR = previous;
    await rm(directory, { recursive: true, force: true });
  }
});
