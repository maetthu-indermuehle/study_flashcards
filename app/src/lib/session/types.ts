/**
 * @module session/types
 * Shared types for the session layer.
 *
 * Kept in a separate file so the payload type can be imported by both the
 * codec (Node.js crypto) and the cookie helpers (next/headers) without
 * creating a circular dependency.
 */

/**
 * The data encoded inside a signed session cookie.
 *
 * Fields are kept minimal — only what is needed to identify the user and
 * check expiry. Never include sensitive data (passwords, full PII) here.
 */
export type SessionPayload = {
  /** The database user ID (CUID). */
  userId: string;
  /** The user's email address, included for display purposes only. */
  email: string;
  /** Issued-at timestamp (Unix seconds). */
  iat: number;
  /** Expiry timestamp (Unix seconds). */
  exp: number;
};
