import { PrismaClient } from "@prisma/client";

// Reuse a single PrismaClient across hot-reloads (dev) and warm serverless
// invocations (Vercel), instead of opening a fresh connection pool every time.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
