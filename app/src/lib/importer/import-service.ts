/**
 * @module importer/import-service
 * Writes a validated batch of {@link ParsedCard} objects to the database.
 *
 * Call flow:
 *   1. Resolve the target deck by name and owner.
 *   2. Create an {@link ImportBatch} row with status `DRAFT` — **outside** the
 *      main transaction so the row persists even when the write transaction
 *      rolls back, making failures auditable.
 *   3. Run a single Prisma transaction: upsert each card, replace its choices,
 *      upsert its tags, and recreate its source reference.
 *   4. Mark the batch `IMPORTED` on success or `FAILED` on error.
 *
 * Media assets are skipped at import time and will be wired up in Phase 7.
 */

import { prisma } from "../db/client";
import {
  TagType,
  ImportStatus,
  ImportSourceType,
} from "../../generated/prisma/enums";
import type { ParsedCard } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Options controlling a single import run.
 */
export type ImportOptions = {
  /**
   * Name of the target deck (= subject label).
   * The deck is created for `userId` if it does not already exist.
   */
  deckName: string;
  /** ID of the user who owns the deck and will be recorded on the batch. */
  userId: string;
  /**
   * The original JSON string that was uploaded. Stored in the ImportBatch row
   * for audit purposes so the exact input can be retrieved later.
   */
  rawInput?: string;
};

/**
 * Summary returned after a successful import.
 */
export type ImportResult = {
  /** CUID of the {@link ImportBatch} row created for this run. */
  batchId: string;
  /** Number of cards inserted for the first time. */
  created: number;
  /** Number of cards that already existed and were refreshed in place. */
  updated: number;
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Imports a validated batch of cards into the named deck.
 *
 * Cards are upserted by `(deckId, originalId)` so re-importing the same JSON
 * file refreshes card text and choices without creating duplicates. Choices,
 * tags, and source references are replaced wholesale on every upsert.
 *
 * @param cards   Parsed and validated cards from {@link parseJsonCards} and
 *                {@link validate}.
 * @param options Target deck name and owning user ID.
 * @returns A summary of cards created and updated.
 *
 * @throws {Error} If the deck named by `options.deckName` is not found.
 * @throws {Error} If the database transaction fails.
 *
 * @example
 * ```ts
 * const result = await importCards(cards, {
 *   deckName: "Canadian PPL",
 *   userId: "clxyz...",
 * });
 * console.log(`Created: ${result.created}, Updated: ${result.updated}`);
 * ```
 */
export async function importCards(
  cards: ParsedCard[],
  options: ImportOptions,
): Promise<ImportResult> {
  const { deckName, userId, rawInput } = options;

  // -------------------------------------------------------------------------
  // Step 1 — resolve the target deck
  // -------------------------------------------------------------------------

  // Find the deck or create it when importing a new subject for the first time.
  let deck = await prisma.deck.findFirst({
    where: { name: deckName, createdByUserId: userId },
    select: { id: true },
  });

  if (!deck) {
    deck = await prisma.deck.create({
      data: { name: deckName, createdByUserId: userId },
      select: { id: true },
    });
  }

  const deckId = deck.id;

  // -------------------------------------------------------------------------
  // Step 2 — create the ImportBatch outside the transaction
  //
  // Creating the batch before the transaction means the row exists even if the
  // transaction rolls back. The `FAILED` status update in the catch block below
  // records the error so operators can audit what went wrong.
  // -------------------------------------------------------------------------

  const batch = await prisma.importBatch.create({
    data: {
      userId,
      sourceType: ImportSourceType.JSON,
      status: ImportStatus.DRAFT,
      rawInput: rawInput ?? null,
    },
    select: { id: true },
  });

  const batchId = batch.id;

  // -------------------------------------------------------------------------
  // Step 3 — write all cards in one transaction
  // -------------------------------------------------------------------------

  let created = 0;
  let updated = 0;

  try {
    await prisma.$transaction(
      async (tx) => {
        for (const card of cards) {
          // ------------------------------------------------------------------
          // Upsert the card by (deckId, originalId).
          //
          // There is no DB-level unique constraint on this pair, so we use
          // findFirst + update/create instead of prisma's built-in upsert.
          // ------------------------------------------------------------------

          const existing = await tx.card.findFirst({
            where: { deckId, originalId: card.sourceId },
            select: { id: true },
          });

          let cardId: string;

          const cardFields = {
            type: card.cardType,
            question: card.questionText,
            answer: card.answerText,
            explanation: card.explanation,
            difficulty: card.difficulty ?? "MEDIUM",
            // Imported cards are immediately available for study.
            status: "PUBLISHED" as const,
            importBatchId: batchId,
          };

          if (existing) {
            await tx.card.update({
              where: { id: existing.id },
              data: cardFields,
            });
            cardId = existing.id;
            updated++;
          } else {
            const inserted = await tx.card.create({
              data: {
                ...cardFields,
                deckId,
                createdByUserId: userId,
                originalId: card.sourceId,
              },
              select: { id: true },
            });
            cardId = inserted.id;
            created++;
          }

          // ------------------------------------------------------------------
          // Replace choices.
          //
          // Always delete first so a card changing from MC → open-answer
          // leaves no stale choices behind.
          // ------------------------------------------------------------------

          await tx.choice.deleteMany({ where: { cardId } });

          if (card.cardType === "MULTIPLE_CHOICE") {
            await tx.choice.createMany({
              data: card.choices.map((choice, i) => ({
                cardId,
                text: choice.text,
                isCorrect: choice.isCorrect,
                sortOrder: i,
              })),
            });
          }

          // ------------------------------------------------------------------
          // Replace tags.
          //
          // `topic` becomes a TOPIC tag; freeform tags become CUSTOM tags.
          // Tags are upserted globally so the same tag can be shared across
          // cards without duplication.
          // ------------------------------------------------------------------

          await tx.cardTag.deleteMany({ where: { cardId } });

          const tagsToApply: Array<{ name: string; type: TagType }> = [];

          if (card.topic) {
            tagsToApply.push({ name: card.topic, type: TagType.TOPIC });
          }

          for (const tagName of card.tags) {
            tagsToApply.push({ name: tagName, type: TagType.CUSTOM });
          }

          for (const { name, type } of tagsToApply) {
            const tag = await tx.tag.upsert({
              where: { name_type: { name, type } },
              update: {},
              create: { name, type },
              select: { id: true },
            });
            await tx.cardTag.create({ data: { cardId, tagId: tag.id } });
          }

          // ------------------------------------------------------------------
          // Replace the source reference.
          //
          // One reference per card for now. The schema supports multiple, but
          // the JSON format captures a single reference string.
          // ------------------------------------------------------------------

          await tx.sourceReference.deleteMany({ where: { cardId } });

          if (card.reference) {
            await tx.sourceReference.create({
              data: { cardId, label: card.reference },
            });
          }

          // Media assets are deferred to Phase 7 — the `media` field on
          // ParsedCard is intentionally ignored here.
        }
      },
      { timeout: 30_000 },
    );

    // -------------------------------------------------------------------------
    // Step 4a — mark the batch as successfully imported
    // -------------------------------------------------------------------------

    await prisma.importBatch.update({
      where: { id: batchId },
      data: {
        status: ImportStatus.IMPORTED,
        summary: `Created: ${created}, Updated: ${updated}`,
      },
    });
  } catch (err) {
    // -------------------------------------------------------------------------
    // Step 4b — record the failure so it is visible in the audit trail.
    //
    // The transaction has rolled back at this point, so all card writes are
    // undone. The ImportBatch row persists (it was created outside the tx).
    // -------------------------------------------------------------------------

    await prisma.importBatch.update({
      where: { id: batchId },
      data: {
        status: ImportStatus.FAILED,
        summary: err instanceof Error ? err.message : String(err),
      },
    });

    throw err;
  }

  return { batchId, created, updated };
}
