"use server";

/**
 * @module lib/import/actions
 * Server Actions for the bulk-import UI.
 *
 * Two-step flow:
 *   1. `dryRunImport` — parse + validate, query DB for existing IDs →
 *      returns a preview with counts and any errors. No data is written.
 *   2. `runImport` — parse + validate + write → returns the final counts
 *      and the ImportBatch ID. Stores the raw JSON in the batch row.
 *
 * Both actions require EDITOR role.
 */

import { prisma } from "@/lib/db/client";
import { requireRole } from "@/lib/auth/permissions";
import { parseJsonCards } from "@/lib/importer/json-parser";
import { validate } from "@/lib/importer/validator";
import { importCards } from "@/lib/importer/import-service";
import { partitionCounts, buildSample } from "@/lib/import/dry-run-helpers";
import type { ValidationError } from "@/lib/importer/validator";

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export type DryRunResult =
  | {
      ok: true;
      totalCards: number;
      /** Cards whose originalId already exists in the DB — will be updated. */
      toUpdate: number;
      /** Cards with no matching originalId — will be created. */
      toCreate: number;
      errors: ValidationError[];
      warnings: ValidationError[];
      /** First 10 card IDs + question text for the preview table. */
      sample: { sourceId: string; question: string; isNew: boolean }[];
    }
  | { ok: false; error: string };

export type RunResult =
  | {
      ok: true;
      batchId: string;
      created: number;
      updated: number;
      warnings: ValidationError[];
    }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Parses and validates the JSON string, then checks the DB for existing card
 * IDs. Returns a preview without writing anything to the database.
 */
export async function dryRunImport(json: string): Promise<DryRunResult> {
  try {
    const { userId } = await requireRole("EDITOR");

    // Step 1: structural parse (throws on bad JSON / schema mismatch)
    let cards;
    try {
      cards = parseJsonCards(json);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }

    if (cards.length === 0) {
      return { ok: false, error: "The JSON file contains no cards." };
    }

    // Step 2: semantic validation
    const issues = validate(cards);
    const errors = issues.filter((i) => i.severity === "error");
    const warnings = issues.filter((i) => i.severity === "warning");

    // Step 3: check which sourceIds already exist in this user's deck
    const sourceIds = cards.map((c) => c.sourceId);
    const existing = await prisma.card.findMany({
      where: {
        deck: { createdByUserId: userId },
        originalId: { in: sourceIds },
      },
      select: { originalId: true },
    });
    const existingSet = new Set(
      existing.map((c) => c.originalId).filter((id): id is string => id !== null),
    );
    const { toCreate, toUpdate } = partitionCounts(cards, existingSet);

    // Step 4: build sample (first 10)
    const sample = buildSample(cards, existingSet);

    return { ok: true, totalCards: cards.length, toCreate, toUpdate, errors, warnings, sample };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Runs the full import pipeline: parse → validate → write to DB.
 * Stores the raw JSON in the ImportBatch row for audit purposes.
 * Blocks on hard validation errors (severity === "error").
 */
export async function runImport(json: string): Promise<RunResult> {
  try {
    const { userId } = await requireRole("EDITOR");

    let cards;
    try {
      cards = parseJsonCards(json);
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }

    const issues = validate(cards);
    const errors = issues.filter((i) => i.severity === "error");
    if (errors.length > 0) {
      return {
        ok: false,
        error: `Import blocked by ${errors.length} validation error(s). Fix them and try again.`,
      };
    }

    const warnings = issues.filter((i) => i.severity === "warning");

    // Resolve the user's deck name — same logic as the seed/CLI.
    const deck = await prisma.deck.findFirst({
      where: { createdByUserId: userId },
      select: { name: true },
    });
    if (!deck) {
      return { ok: false, error: "No deck found for your account." };
    }

    const result = await importCards(cards, {
      deckName: deck.name,
      userId,
      rawInput: json,
    });

    return {
      ok: true,
      batchId: result.batchId,
      created: result.created,
      updated: result.updated,
      warnings,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Returns the 10 most recent import batches for the current user.
 * Used to render the import history section on the page.
 */
export async function getImportHistory() {
  const { userId } = await requireRole("EDITOR");

  return prisma.importBatch.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      status: true,
      summary: true,
      createdAt: true,
    },
  });
}
