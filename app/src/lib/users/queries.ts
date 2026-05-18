/**
 * @module lib/users/queries
 * Read-only database queries for the user management UI.
 */

import { prisma } from "@/lib/db/client";
import type { UserDetail, UserListItem } from "./types";
import type { UserRole } from "@/lib/session/types";

/** Returns all users ordered by creation date, newest first. */
export async function listUsers(): Promise<UserListItem[]> {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return users.map((u) => ({ ...u, role: u.role as UserRole }));
}

/** Returns a single user by ID, or null if not found. */
export async function getUser(id: string): Promise<UserDetail | null> {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      createdAt: true,
      passwordVersion: true,
    },
  });

  if (!user) return null;
  return { ...user, role: user.role as UserRole };
}

/** Returns the number of users with ADMIN role. Used for last-admin guard. */
export async function countAdmins(): Promise<number> {
  return prisma.user.count({ where: { role: "ADMIN" } });
}
