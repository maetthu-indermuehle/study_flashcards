/**
 * @module session/codec
 * Signs and verifies stateless session tokens using HMAC-SHA256.
 *
 * Token format:
 *   <base64url(JSON payload)>.<hex HMAC-SHA256 signature>
 *
 * The secret is read lazily from `process.env.SESSION_SECRET` so this module
 * can be imported in tests without triggering the full `serverEnv` parse
 * (which requires DATABASE_URL). The app validates SESSION_SECRET at startup
 * via `serverEnv`, so a missing or short secret will crash early in production.
 *
 * This module uses only `node:crypto` — no external dependencies.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import type { SessionPayload } from "./types";

/** Read and validate the session secret from the environment. */
function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET must be set and at least 32 characters long",
    );
  }
  return secret;
}

function toBase64url(s: string): string {
  return Buffer.from(s, "utf-8").toString("base64url");
}

function fromBase64url(s: string): string {
  return Buffer.from(s, "base64url").toString("utf-8");
}

/**
 * Encodes a session payload as a signed token string.
 *
 * @param payload - The session data to encode.
 * @returns A `<base64url payload>.<hex HMAC>` token string.
 */
export function signSession(payload: SessionPayload): string {
  const encoded = toBase64url(JSON.stringify(payload));
  const sig = createHmac("sha256", getSecret())
    .update(encoded)
    .digest("hex");
  return `${encoded}.${sig}`;
}

/**
 * Verifies a session token and returns its payload, or `null` on any failure.
 *
 * Failures include: missing token, tampered signature, expired session,
 * or malformed data. All failures return `null` without throwing so callers
 * can treat them uniformly as "unauthenticated".
 *
 * @param token - The raw cookie value to verify.
 * @returns The decoded {@link SessionPayload}, or `null`.
 */
export function verifySession(
  token: string | undefined,
): SessionPayload | null {
  if (!token) return null;

  const lastDot = token.lastIndexOf(".");
  if (lastDot === -1) return null;

  const encoded = token.slice(0, lastDot);
  const receivedSig = token.slice(lastDot + 1);

  const expectedSig = createHmac("sha256", getSecret())
    .update(encoded)
    .digest("hex");

  // Constant-time comparison prevents timing attacks.
  let sigValid: boolean;
  try {
    sigValid = timingSafeEqual(
      Buffer.from(receivedSig, "hex"),
      Buffer.from(expectedSig, "hex"),
    );
  } catch {
    return null;
  }
  if (!sigValid) return null;

  let payload: SessionPayload;
  try {
    payload = JSON.parse(fromBase64url(encoded)) as SessionPayload;
  } catch {
    return null;
  }

  if (typeof payload.exp !== "number" || Math.floor(Date.now() / 1000) > payload.exp) {
    return null;
  }

  return payload;
}
