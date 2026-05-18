/**
 * @module lib/import/dry-run-helpers
 * Pure functions used by `dryRunImport` that can be tested without DB access.
 */

import type { ParsedCard } from "@/lib/importer/types";

/**
 * Splits a card list into create/update counts given the set of source IDs
 * that already exist in the database.
 */
export function partitionCounts(
  cards: ParsedCard[],
  existingIds: Set<string>,
): { toCreate: number; toUpdate: number } {
  const toUpdate = cards.filter((c) => existingIds.has(c.sourceId)).length;
  return { toCreate: cards.length - toUpdate, toUpdate };
}

/**
 * Builds the preview sample (first 10 cards) for the dry-run response.
 * Question text is truncated at 80 characters for display.
 */
export function buildSample(
  cards: ParsedCard[],
  existingIds: Set<string>,
): { sourceId: string; question: string; isNew: boolean }[] {
  return cards.slice(0, 10).map((c) => ({
    sourceId: c.sourceId,
    question:
      c.questionText.length > 80
        ? c.questionText.slice(0, 80) + "…"
        : c.questionText,
    isNew: !existingIds.has(c.sourceId),
  }));
}
