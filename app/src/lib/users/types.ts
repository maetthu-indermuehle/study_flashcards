/**
 * @module lib/users/types
 * Plain TypeScript types for the user management layer.
 */

import type { UserRole } from "@/lib/session/types";

export type UserListItem = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: Date;
};

export type UserDetail = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: Date;
  passwordVersion: number;
};

export type CreateUserData = {
  email: string;
  displayName: string;
  password: string;
  role: UserRole;
};

export type UpdateUserData = {
  displayName: string;
  role: UserRole;
};
