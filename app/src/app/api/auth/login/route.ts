/**
 * POST /api/auth/login
 *
 * Accepts `{ email, password }` JSON, verifies credentials, and sets a
 * signed session cookie on success.
 *
 * Security measures:
 *   - All credential failures return 401 with the same generic message to
 *     prevent user enumeration.
 *   - Failed attempts are recorded per email; after 10 failures in 15 min
 *     the endpoint returns 429 until the window expires.
 *   - The session cookie includes `role` and `passwordVersion` so the proxy
 *     can do optimistic role checks and Server Actions can detect stale
 *     sessions without an extra DB query on every request.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { verifyPassword } from "@/lib/auth/password";
import { isAccountLocked, recordLoginAttempt } from "@/lib/auth/brute-force";
import { createSessionCookie } from "@/lib/session/cookies";
import type { UserRole } from "@/lib/session/types";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("email" in body) ||
    !("password" in body)
  ) {
    return NextResponse.json(
      { error: "Missing email or password" },
      { status: 400 },
    );
  }

  const { email, password } = body as Record<string, unknown>;
  if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const ip = request.headers.get("x-forwarded-for") ?? undefined;

  // Brute-force gate — checked before touching the user record to prevent
  // timing-based user enumeration via differential lock-out behaviour.
  const locked = await isAccountLocked(email);
  if (locked) {
    return NextResponse.json(
      { error: "Too many failed attempts. Please wait 15 minutes." },
      { status: 429 },
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
        passwordVersion: true,
      },
    });

    const ok = user ? await verifyPassword(password, user.passwordHash) : false;

    await recordLoginAttempt(email, ok, ip);

    if (!ok || !user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    await createSessionCookie(
      user.id,
      user.email,
      user.role as UserRole,
      user.passwordVersion,
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[auth/login]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
