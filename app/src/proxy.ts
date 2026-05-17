/**
 * Next.js Proxy (replaces "middleware" in Next.js 16+).
 *
 * Performs optimistic auth checks on every matched request:
 * - Unauthenticated requests to protected routes → redirect to /login
 * - Authenticated requests to /login → redirect to /
 *
 * "Optimistic" means the decision is based solely on the signed cookie;
 * no database is queried here. Server Components and Route Handlers do
 * the authoritative check against actual data.
 *
 * The matcher excludes API routes, Next.js internals, and static assets
 * so those are never intercepted.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/session/codec";

/** Routes that do not require authentication. */
const PUBLIC_PATHS = new Set(["/login"]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // req.cookies is synchronous on NextRequest — no await needed.
  const token = request.cookies.get("session")?.value;
  const session = verifySession(token);

  const isPublic = PUBLIC_PATHS.has(pathname);

  if (!isPublic && !session) {
    // Preserve the intended destination so the login page could redirect back.
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (isPublic && session) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  /*
   * Run on all routes except:
   *   api/          — route handlers do their own auth checks
   *   _next/static  — Next.js static assets
   *   _next/image   — Next.js image optimisation
   *   common image/icon extensions
   */
  matcher: [
    "/((?!api|_next/static|_next/image|.*\\.(?:png|svg|ico|jpg|jpeg|webp|gif)$).*)",
  ],
};
