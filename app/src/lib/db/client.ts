/**
 * @module lib/db/client
 * Prisma client singleton for the Next.js application.
 *
 * Prisma 7 uses the `prisma-client` generator, which requires an explicit
 * driver adapter instead of the embedded Rust query engine used by older
 * versions. `PrismaPg` wraps `node-postgres` (the `pg` package) and passes
 * the connection pool to `PrismaClient`.
 *
 * The singleton pattern prevents Next.js hot-reload from opening a new
 * connection pool on every file save in development — without it each module
 * reload would leak a pool.
 */

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

/**
 * Creates a new `PrismaClient` backed by a `node-postgres` connection pool.
 *
 * Called once at startup (or once per hot-reload cycle in development, before
 * the singleton guard takes effect). The `DATABASE_URL` environment variable
 * must be set; Prisma reads it from `prisma.config.ts` at query time.
 *
 * @returns A fully configured `PrismaClient` instance ready to run queries.
 */
function createPrismaClient() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

// Attach the instance to `globalThis` in development so Next.js hot-reload
// reuses the same pool instead of creating a new one on every file save.
// In production the module is only evaluated once, so this branch is never taken.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * The application-wide Prisma client instance.
 *
 * Use this in server components, route handlers, Server Actions, and any
 * server-side library code that needs database access. Never import this in
 * client components — Prisma and `pg` are Node.js-only.
 *
 * @example
 * ```ts
 * import { prisma } from "@/lib/db/client";
 * const deck = await prisma.deck.findFirst({ where: { id } });
 * ```
 */
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
