"use server";

/**
 * @module lib/users/actions
 * Server Actions for admin user management.
 *
 * All actions require ADMIN role (checked via requireRole). Sensitive
 * operations (role change, password reset, delete) are logged to AdminEvent
 * for accountability. Every mutation that changes auth state increments
 * passwordVersion so the target user's active sessions are invalidated.
 *
 * Safety guards:
 *   - An admin cannot delete their own account.
 *   - An admin cannot demote themselves.
 *   - The last ADMIN cannot be deleted or demoted to a lower role.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireRole } from "@/lib/auth/permissions";
import { hashPassword, MIN_PASSWORD_LENGTH } from "@/lib/auth/password";
import { countAdmins } from "./queries";
import type { CreateUserData, UpdateUserData } from "./types";

type ActionResult = { success: true } | { success: false; error: string };

// ---------------------------------------------------------------------------
// Audit logging helper
// ---------------------------------------------------------------------------

async function logAdminEvent(
  actorId: string,
  action: string,
  targetUserId?: string,
  detail?: Record<string, unknown>,
): Promise<void> {
  await prisma.adminEvent.create({
    data: {
      actorId,
      targetUserId: targetUserId ?? null,
      action,
      // Cast to satisfy Prisma's InputJsonValue — the runtime value is always
      // a plain object which is valid JSON.
      detail: (detail ?? {}) as Parameters<typeof prisma.adminEvent.create>[0]["data"]["detail"],
    },
  });
}

// ---------------------------------------------------------------------------
// Public Server Actions
// ---------------------------------------------------------------------------

/**
 * Creates a new user account.
 * On success, redirects to the new user's edit page.
 */
export async function createUser(data: CreateUserData): Promise<ActionResult> {
  try {
    const { userId: actorId } = await requireRole("ADMIN");

    if (!data.email.trim() || !data.displayName.trim()) {
      return { success: false, error: "Email and display name are required." };
    }
    if (data.password.length < MIN_PASSWORD_LENGTH) {
      return {
        success: false,
        error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      };
    }

    const existing = await prisma.user.findUnique({
      where: { email: data.email.trim().toLowerCase() },
    });
    if (existing) {
      return { success: false, error: "A user with this email already exists." };
    }

    const passwordHash = await hashPassword(data.password);
    const user = await prisma.user.create({
      data: {
        email: data.email.trim().toLowerCase(),
        displayName: data.displayName.trim(),
        passwordHash,
        role: data.role,
      },
      select: { id: true },
    });

    await logAdminEvent(actorId, "CREATE_USER", user.id, {
      email: data.email.trim().toLowerCase(),
      role: data.role,
    });

    revalidatePath("/admin/users");
  } catch (e) {
    return { success: false, error: String(e) };
  }

  redirect("/admin/users");
}

/**
 * Updates a user's display name and role.
 * Increments passwordVersion if the role changes, invalidating existing sessions.
 */
export async function updateUser(
  targetId: string,
  data: UpdateUserData,
): Promise<ActionResult> {
  try {
    const { userId: actorId } = await requireRole("ADMIN");

    if (!data.displayName.trim()) {
      return { success: false, error: "Display name is required." };
    }

    const target = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, role: true, displayName: true },
    });
    if (!target) return { success: false, error: "User not found." };

    // Last-admin guard: prevent demoting the last ADMIN.
    if (target.role === "ADMIN" && data.role !== "ADMIN") {
      const adminCount = await countAdmins();
      if (adminCount <= 1) {
        return {
          success: false,
          error: "Cannot demote the last admin. Promote another user first.",
        };
      }
    }

    // Self-demotion guard.
    if (actorId === targetId && data.role !== "ADMIN") {
      return {
        success: false,
        error: "You cannot demote your own account.",
      };
    }

    const roleChanged = target.role !== data.role;

    await prisma.user.update({
      where: { id: targetId },
      data: {
        displayName: data.displayName.trim(),
        role: data.role,
        // Invalidate sessions when role changes.
        ...(roleChanged ? { passwordVersion: { increment: 1 } } : {}),
      },
    });

    await logAdminEvent(actorId, roleChanged ? "CHANGE_ROLE" : "UPDATE_USER", targetId, {
      oldRole: target.role,
      newRole: data.role,
      displayName: data.displayName.trim(),
    });

    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${targetId}`);
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/**
 * Resets another user's password. Increments passwordVersion to invalidate
 * all of that user's active sessions.
 */
export async function resetPassword(
  targetId: string,
  newPassword: string,
): Promise<ActionResult> {
  try {
    const { userId: actorId } = await requireRole("ADMIN");

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return {
        success: false,
        error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      };
    }

    const target = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true },
    });
    if (!target) return { success: false, error: "User not found." };

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: targetId },
      data: {
        passwordHash,
        passwordVersion: { increment: 1 }, // invalidates all active sessions
      },
    });

    await logAdminEvent(actorId, "RESET_PASSWORD", targetId);

    revalidatePath(`/admin/users/${targetId}`);
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/**
 * Deletes a user account permanently.
 *
 * Guards: cannot delete yourself; cannot delete the last admin.
 */
export async function deleteUser(targetId: string): Promise<ActionResult> {
  try {
    const { userId: actorId } = await requireRole("ADMIN");

    if (actorId === targetId) {
      return { success: false, error: "You cannot delete your own account." };
    }

    const target = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, email: true, role: true },
    });
    if (!target) return { success: false, error: "User not found." };

    if (target.role === "ADMIN") {
      const adminCount = await countAdmins();
      if (adminCount <= 1) {
        return {
          success: false,
          error: "Cannot delete the last admin account.",
        };
      }
    }

    await logAdminEvent(actorId, "DELETE_USER", targetId, {
      email: target.email,
      role: target.role,
    });

    await prisma.user.delete({ where: { id: targetId } });

    revalidatePath("/admin/users");
  } catch (e) {
    return { success: false, error: String(e) };
  }

  redirect("/admin/users");
}

/**
 * Allows a user to change their own password.
 * Requires current password for confirmation. Increments passwordVersion
 * so other sessions are invalidated (the current session will need to
 * re-login after the next request).
 */
export async function changeOwnPassword(
  currentPassword: string,
  newPassword: string,
): Promise<ActionResult> {
  try {
    const { userId } = await requireRole("USER");

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return {
        success: false,
        error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!user) return { success: false, error: "User not found." };

    const { verifyPassword } = await import("@/lib/auth/password");
    const ok = await verifyPassword(currentPassword, user.passwordHash);
    if (!ok) {
      return { success: false, error: "Current password is incorrect." };
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        passwordVersion: { increment: 1 },
      },
    });

    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
