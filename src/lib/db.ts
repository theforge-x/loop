import { PrismaClient } from "@prisma/client";

const globalDb = globalThis as typeof globalThis & { loopDb?: PrismaClient };
export const db = globalDb.loopDb ?? new PrismaClient({ transactionOptions: { maxWait: 15_000, timeout: 60_000 } });
if (process.env.NODE_ENV !== "production") globalDb.loopDb = db;
