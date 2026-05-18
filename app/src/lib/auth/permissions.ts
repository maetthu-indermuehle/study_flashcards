/**
 * @module auth/permissions
 * Role hierarchy and Server Action auth helpers.
 *
 * Every sensitive Server Action calls `requireRole(minRole)` which:
 *   1. Reads the signed session cookie (fast, no DB).
 *   2. Checks the cached role from the cookie against `minRole`.
 *   3. Queries the DB to verify `passwordVersion` — catches sessions that
 *      were issued before a password change or role change.
 *   4. Re-checks the DB role to catch role downgrades that happened after
 *      the session was issued.
 *
 * The proxy does an optimistic role check (cookie-only, no DB) so the
 * common path is fast. The DB check here is the authoritative gate.
 */

import { prisma } from "@/lib/db/client";
import { readSessionCookie } from "@/lib/session/cookies";
import type { UserRole } from "@/lib/session/types";

/** Numeric rank for each role. Higher = more permissions. */
const ROLE_RANK: Record<UserRole, number> = {
  USER: 0,
  EDITOR: 1,
  ADMIN: 2,
};

/** Returns true when `actual` satisfies `required`. */
export function hasRole(actual: UserRole, required: UserRole): boolean {
  return ROLE_RANK[actual] >= ROLE_RANK[required];
}

export type AuthContext = {
  userId: string;
  role: UserRole;
};

/**
 * Authenticates the request and enforces a minimum role.
 *
 * Throws a plain `Error` (not a redirect) so Server Actions can catch it
 * and return a structured error response. Pages should call
 * `readSessionCookie()` directly and use `redirect("/login")` instead.
 *
 * @throws If the session is absent, expired, invalidated, or the user's
 *         role is below `minRole`.
 */
export async function requireRole(minRole: UserRole): Promise<AuthContext> {
  const session = await readSessionCookie();
  if (!session) throw new Error("Unauthenticated");

  // Fast cookie-level role check before hitting the DB.
  if (!hasRole(session.role, minRole)) throw new Error("Forbidden");

  // Authoritative DB check: verify the session has not been invalidated
  // and the user's current role still satisfies minRole.
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true, passwordVersion: true },
  });

  if (!user) throw new Error("Unauthenticated");

  if (user.passwordVersion !== session.passwordVersion) {
    // Password or role was changed — all sessions for this user are stale.
    throw new Error("Unauthenticated");
  }

  if (!hasRole(user.role as UserRole, minRole)) {
    // Role was downgraded after this session was issued.
    throw new Error("Forbidden");
  }

  return { userId: session.userId, role: user.role as UserRole };
}
