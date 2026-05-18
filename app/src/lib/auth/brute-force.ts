/**
 * @module auth/brute-force
 * Login attempt tracking and account lock-out.
 *
 * Strategy:
 *   - Count failed attempts for a given email in the last WINDOW_MS.
 *   - Lock the account after MAX_ATTEMPTS failures (returns 429 to caller).
 *   - Prune rows older than 24 h on every write to keep the table small.
 *
 * Email is normalised to lower-case before storage so "User@example.com"
 * and "user@example.com" are treated as the same account.
 *
 * Note: We record attempts BEFORE looking up the user so that attempts
 * against non-existent accounts are counted equally, preventing user
 * enumeration via differential timing on the lock-out response.
 */

import { prisma } from "@/lib/db/client";

/** Rolling window for failed attempt counting. */
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/** Number of failures in the window that triggers a lock. */
const MAX_ATTEMPTS = 10;

/** How long to keep raw rows before pruning them. */
const RETENTION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Returns true when `email` has exceeded the failure threshold within the
 * rolling window and should be denied further login attempts.
 */
export async function isAccountLocked(email: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);
  const count = await prisma.loginAttempt.count({
    where: {
      email: email.toLowerCase(),
      succeeded: false,
      attemptedAt: { gte: since },
    },
  });
  return count >= MAX_ATTEMPTS;
}

/**
 * Records a login attempt and prunes rows older than 24 h.
 *
 * @param email      - The email address used in the attempt.
 * @param succeeded  - Whether the login was successful.
 * @param ipAddress  - Optional; stored for audit purposes.
 */
export async function recordLoginAttempt(
  email: string,
  succeeded: boolean,
  ipAddress?: string,
): Promise<void> {
  const cutoff = new Date(Date.now() - RETENTION_MS);

  await prisma.$transaction([
    prisma.loginAttempt.create({
      data: {
        email: email.toLowerCase(),
        succeeded,
        ipAddress: ipAddress ?? null,
      },
    }),
    // Prune old rows in the same transaction so we don't need a cron job.
    prisma.loginAttempt.deleteMany({
      where: { attemptedAt: { lt: cutoff } },
    }),
  ]);
}
