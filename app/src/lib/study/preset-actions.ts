"use server";

/**
 * @module study/preset-actions
 * Server Actions for managing study presets.
 *
 * Any authenticated user can create and delete their own presets.
 * EDITOR and ADMIN can toggle `isShared` to make a preset visible to all users.
 */

import { prisma } from "@/lib/db/client";
import { requireRole } from "@/lib/auth/permissions";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export type CreatePresetResult = { ok: true; id: string } | { ok: false; error: string };

/**
 * Creates a new study preset for the current user.
 * `tagIds` may be empty, which means "study all cards" (no tag filter).
 */
export async function createPreset(
  name: string,
  tagIds: string[],
): Promise<CreatePresetResult> {
  try {
    const { userId } = await requireRole("USER");

    const trimmed = name.trim();
    if (!trimmed) return { ok: false, error: "Preset name is required." };
    if (trimmed.length > 80) return { ok: false, error: "Name must be 80 characters or fewer." };

    const preset = await prisma.studyPreset.create({
      data: { userId, name: trimmed, tagIds },
      select: { id: true },
    });

    revalidatePath("/study/setup");
    return { ok: true, id: preset.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ---------------------------------------------------------------------------
// Update sharing flag (EDITOR / ADMIN only)
// ---------------------------------------------------------------------------

export type UpdateSharedResult = { ok: true } | { ok: false; error: string };

/**
 * Toggles `isShared` on a preset. Only the owner, or an ADMIN, can do this.
 * Sharing requires at least EDITOR role so random users can't pollute the
 * shared preset list.
 */
export async function setPresetShared(
  presetId: string,
  isShared: boolean,
): Promise<UpdateSharedResult> {
  try {
    const { userId, role } = await requireRole("EDITOR");

    const preset = await prisma.studyPreset.findUnique({
      where: { id: presetId },
      select: { userId: true },
    });
    if (!preset) return { ok: false, error: "Preset not found." };

    // Only the owner or an admin can change sharing.
    if (preset.userId !== userId && role !== "ADMIN") {
      return { ok: false, error: "You do not have permission to change this preset." };
    }

    await prisma.studyPreset.update({
      where: { id: presetId },
      data: { isShared },
    });

    revalidatePath("/study/setup");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export type DeletePresetResult = { ok: true } | { ok: false; error: string };

/**
 * Deletes a preset. Only the owner or an ADMIN can delete it.
 */
export async function deletePreset(presetId: string): Promise<DeletePresetResult> {
  try {
    const { userId, role } = await requireRole("USER");

    const preset = await prisma.studyPreset.findUnique({
      where: { id: presetId },
      select: { userId: true },
    });
    if (!preset) return { ok: false, error: "Preset not found." };

    if (preset.userId !== userId && role !== "ADMIN") {
      return { ok: false, error: "You do not have permission to delete this preset." };
    }

    await prisma.studyPreset.delete({ where: { id: presetId } });

    revalidatePath("/study/setup");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
