import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { randomToken, tokenHash } from "./security";

const cookieName = "loop_admin";
const sessionDuration = 8 * 60 * 60 * 1000;

export async function currentAdmin() {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token || !/^[\w-]{43}$/.test(token)) return null;
  const session = await db.adminSession.findUnique({
    where: { id: tokenHash(token) },
    select: { expiresAt: true, admin: { select: { id: true, email: true, active: true } } },
  });
  return session && session.admin.active && session.expiresAt > new Date() ? session.admin : null;
}

export async function requireAdmin() {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

export async function startSession(adminId: string) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + sessionDuration);
  const cookieStore = await cookies();
  const previous = cookieStore.get(cookieName)?.value;
  await db.$transaction([
    db.adminSession.deleteMany({ where: { OR: [{ expiresAt: { lte: new Date() } }, ...(previous ? [{ id: tokenHash(previous) }] : [])] } }),
    db.adminSession.create({ data: { id: tokenHash(token), adminId, expiresAt } }),
  ]);
  cookieStore.set(cookieName, token, {
    expires: expiresAt,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.APP_URL?.startsWith("https://") ?? process.env.NODE_ENV === "production",
    path: "/admin",
  });
}

export async function endSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName)?.value;
  if (token) await db.adminSession.deleteMany({ where: { id: tokenHash(token) } });
  cookieStore.set(cookieName, "", { path: "/admin", maxAge: 0 });
}
