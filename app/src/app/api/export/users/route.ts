/**
 * GET /api/export/users
 *
 * Returns all users as a downloadable JSON file.
 * Requires ADMIN role.
 */

import { NextRequest, NextResponse } from "next/server";
import { readSessionCookie } from "@/lib/session/cookies";
import { hasRole } from "@/lib/auth/permissions";
import { getAllUsers } from "@/lib/export/queries";

export async function GET(_req: NextRequest) {
  const session = await readSessionCookie();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasRole(session.role, "ADMIN")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const users = await getAllUsers();
  const json = JSON.stringify({ users }, null, 2);

  return new Response(json, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="users.json"',
    },
  });
}
