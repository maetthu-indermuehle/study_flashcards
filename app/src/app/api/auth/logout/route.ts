/**
 * POST /api/auth/logout
 *
 * Clears the session cookie, effectively logging the user out.
 * Always returns 200 — logging out when not logged in is a no-op.
 */

import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/session/cookies";

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
