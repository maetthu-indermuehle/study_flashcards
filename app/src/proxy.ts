/**
 * Next.js Proxy (replaces "middleware" in Next.js 16+).
 *
 * Performs OPTIMISTIC auth and role checks on every matched request.
 * "Optimistic" = decisions are based solely on the signed cookie; no
 * database is queried. Server Components and Server Actions do the
 * authoritative check (including passwordVersion verification) against
 * actual DB data.
 *
 * Route table:
 *   /login         — public; authenticated users are redirected to /
 *   /admin/*       — requires ADMIN role
 *   /cards/*       — requires EDITOR role
 *   /import        — requires EDITOR role
 *   /export        — requires EDITOR role
 *   /profile       — requires any authenticated user
 *   everything else — requires any authenticated user
 *
 * The matcher excludes API routes, Next.js internals, and static assets.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/session/codec";
import type { UserRole } from "@/lib/session/types";

/** Routes that do not require authentication. */
const PUBLIC_PATHS = new Set(["/login"]);

/** Numeric rank used for optimistic role comparison (mirrors permissions.ts). */
const ROLE_RANK: Record<UserRole, number> = { USER: 0, EDITOR: 1, ADMIN: 2 };

function hasRole(actual: UserRole, required: UserRole): boolean {
  return ROLE_RANK[actual] >= ROLE_RANK[required];
}

/** Returns the minimum role required for `pathname`, or null if public. */
function requiredRole(pathname: string): UserRole | null {
  if (PUBLIC_PATHS.has(pathname)) return null;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "ADMIN";
  if (pathname === "/cards" || pathname.startsWith("/cards/")) return "EDITOR";
  if (pathname === "/import") return "EDITOR";
  if (pathname === "/export") return "EDITOR";
  return "USER"; // all other authenticated routes
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // req.cookies is synchronous on NextRequest — no await needed.
  const token = request.cookies.get("session")?.value;
  const session = verifySession(token);

  const minRole = requiredRole(pathname);

  // Public route — redirect authenticated users away from /login.
  if (minRole === null) {
    if (session) return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.next();
  }

  // Protected route — must be authenticated.
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Role check (optimistic — DB is not queried here).
  if (!hasRole(session.role, minRole)) {
    // Authenticated but insufficient role → redirect to home.
    return NextResponse.redirect(new URL("/", request.url));
  }

  // All checks passed — build the response.
  const response = NextResponse.next();

  // Record the last study session so the home page can jump straight back into it.
  // Stored as the raw tagIds query param value (comma-separated, or "" for all cards).
  // Written on every /study request (not /study/setup) so dueOnly-only visits also count.
  if (pathname === "/study") {
    response.cookies.set("lastStudy", request.nextUrl.searchParams.get("tagIds") ?? "", {
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });
  }

  return response;
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
