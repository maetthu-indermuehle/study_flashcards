/**
 * @module session/types
 * Shared types for the session layer.
 *
 * Kept in a separate file so the payload type can be imported by both the
 * codec (Node.js crypto) and the cookie helpers (next/headers) without
 * creating a circular dependency.
 */

/**
 * The three permission levels in the application.
 * Defined here (not imported from Prisma) so it can be used in the session
 * layer without pulling in DB dependencies.
 *
 * USER   — study, flag cards, change own password.
 * EDITOR — USER + create/edit/import cards.
 * ADMIN  — EDITOR + manage users.
 */
export type UserRole = "USER" | "EDITOR" | "ADMIN";

/**
 * The data encoded inside a signed session cookie.
 *
 * Fields are kept minimal — only what is needed to identify the user and
 * check expiry. Never include sensitive data (passwords, full PII) here.
 *
 * `role` is cached here for quick proxy checks without a DB round-trip.
 * `passwordVersion` is matched against the DB on every sensitive action;
 *   a mismatch (triggered by a password change or role change) forces
 *   re-login, effectively invalidating the session.
 */
export type SessionPayload = {
  /** The database user ID (CUID). */
  userId: string;
  /** The user's email address, included for display purposes only. */
  email: string;
  /** Cached role for optimistic proxy checks. Authoritative check is in DB. */
  role: UserRole;
  /** Matched against User.passwordVersion; mismatch → force re-login. */
  passwordVersion: number;
  /** Issued-at timestamp (Unix seconds). */
  iat: number;
  /** Expiry timestamp (Unix seconds). */
  exp: number;
};
