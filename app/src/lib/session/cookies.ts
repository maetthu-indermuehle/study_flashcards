/**
 * @module session/cookies
 * Server-side helpers for reading and writing the session cookie.
 *
 * All functions here import `next/headers` and must only be called from
 * Server Components, Server Actions, or Route Handlers — never from the
 * proxy (which uses `request.cookies` on the raw `NextRequest` instead).
 */

import { cookies } from "next/headers";
import { serverEnv } from "@/lib/env/server";
import { signSession, verifySession } from "./codec";
import type { SessionPayload } from "./types";

const COOKIE_NAME = "session";

/**
 * Creates a signed session cookie for the given user and sets it on the
 * response. The cookie is HTTP-only, SameSite=Lax, and Secure in production.
 *
 * @param userId - The user's database ID.
 * @param email  - The user's email address (stored for display only).
 */
export async function createSessionCookie(
  userId: string,
  email: string,
): Promise<void> {
  const maxAge = serverEnv.SESSION_MAX_AGE_SECONDS;
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    userId,
    email,
    iat: now,
    exp: now + maxAge,
  };

  const token = signSession(payload);
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: serverEnv.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

/**
 * Reads and verifies the session cookie from the current request.
 *
 * @returns The decoded {@link SessionPayload} if the cookie is valid,
 *   or `null` if absent, expired, or tampered.
 */
export async function readSessionCookie(): Promise<SessionPayload | null> {
  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;
  return verifySession(value);
}

/**
 * Deletes the session cookie, effectively logging the user out.
 */
export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
