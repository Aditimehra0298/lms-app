import { PrismaClient } from "@prisma/client";

/** Bump when Prisma schema changes so dev HMR does not keep a stale client. */
const PRISMA_CLIENT_KEY = "prisma-v2-email-otp";

const globalForPrisma = globalThis as unknown as {
  [key: string]: PrismaClient | undefined;
};

function createPrisma(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma[PRISMA_CLIENT_KEY] ?? createPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma[PRISMA_CLIENT_KEY] = prisma;
}
