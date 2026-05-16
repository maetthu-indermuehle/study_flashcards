import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

// Prisma 7 with the prisma-client generator requires an explicit driver
// adapter instead of the embedded Rust query engine used by prisma-client-js.
// PrismaPg wraps node-postgres (pg) and passes it to PrismaClient.
function createPrismaClient() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

// Next.js hot-reload in development recreates modules on each change, which
// would normally spawn a new PrismaClient (and a new connection pool) on every
// save. Storing the instance on globalThis prevents that. In production the
// module is loaded once and this branch is never taken.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
