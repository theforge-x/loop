import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { isIP } from "node:net";
import { db } from "./db";

const deriveKey = promisify(scrypt);
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export const randomToken = () => randomBytes(32).toString("base64url");
export const tokenHash = digest;
export const newInvitationCode = () => randomBytes(12).toString("hex").toUpperCase().match(/.{6}/g)!.join("-");
export const codeHash = (code: string) => digest(code.replace(/[-\s]/g, "").toUpperCase());
export const reference = (prefix: string) => prefix + "-" + randomBytes(10).toString("hex").toUpperCase();

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = await deriveKey(password, salt, 64) as Buffer;
  return salt + ":" + key.toString("hex");
}

export async function verifyPassword(password: string, hash?: string) {
  const [salt, expected] = (hash ?? "").split(":");
  const actual = await deriveKey(password, salt || "loop-invalid-password-salt", 64) as Buffer;
  return !!expected && /^[a-f0-9]{128}$/.test(expected) && timingSafeEqual(actual, Buffer.from(expected, "hex"));
}

export function clientIdentity(headers: Headers) {
  const name = process.env.TRUSTED_CLIENT_IP_HEADER;
  const ip = name ? headers.get(name)?.split(",").at(-1)?.trim() : undefined;
  return ip && isIP(ip) ? ip : "shared";
}

export async function allowAttempt(scope: string, identity: string, limit: number, minutes = 15) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("Configure AUTH_SECRET with at least 32 characters.");
  const interval = minutes * 60_000;
  const window = Math.floor(Date.now() / interval);
  const key = createHmac("sha256", secret).update(JSON.stringify([scope, identity, window])).digest("hex");
  const expiresAt = new Date((window + 1) * interval);
  // LAST_INSERT_ID(value) returns this request's counter on the same connection.
  const [, [counter]] = await db.$transaction([
    db.$executeRaw`INSERT INTO rate_limits (\`key\`, hits, expiresAt) VALUES (${key}, LAST_INSERT_ID(1), ${expiresAt})
      ON DUPLICATE KEY UPDATE hits = LAST_INSERT_ID(LEAST(hits + 1, ${limit + 1}))`,
    db.$queryRaw<{ hits: bigint }[]>`SELECT LAST_INSERT_ID() AS hits`,
  ]);
  if (Math.random() < 0.02) await db.rateLimit.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  return Number(counter.hits) <= limit;
}
