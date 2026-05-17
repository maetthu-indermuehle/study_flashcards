/**
 * @module study/get-next-card
 * Selects the next card to study, prioritising due cards over new cards.
 *
 * Selection order:
 *   1. A card with CardProgress.dueAt ≤ now (overdue / due today), soonest first.
 *   2. A card the user has never reviewed (no CardProgress row) — random pick.
 *   3. The next-soonest upcoming card (all cards reviewed, none currently due —
 *      studying ahead of schedule).
 *
 * Falls back to null only when the deck is empty or does not exist.
 */

import { prisma } from "@/lib/db/client";
import { TagType } from "../../generated/prisma/enums";
import type { StudyCard, StudyCardChoice } from "./types";

// ---------------------------------------------------------------------------
// Internal types — raw Prisma result shapes (shared with get-random-card.ts)
// ---------------------------------------------------------------------------

type RawChoice = { id: string; text: string; isCorrect: boolean };
type RawReference = { label: string; url: string | null };
type RawCard = {
  id: string;
  type: "MULTIPLE_CHOICE" | "OPEN_ANSWER";
  question: string;
  answer: string;
  explanation: string | null;
  originalId: string | null;
  choices: RawChoice[];
  references: RawReference[];
  tags: { note: string | null; tag: { name: string } }[];
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the next card to study for `userId`, applying due-card-first logic.
 *
 * @param userId - The authenticated user's database ID.
 * @returns A shuffled {@link StudyCard}, or `null` if the deck is empty.
 */
export async function getNextCard(userId: string): Promise<StudyCard | null> {
  const deck = await prisma.deck.findFirst({
    where: { createdByUserId: userId },
    select: { id: true },
  });
  if (!deck) return null;

  const now = new Date();

  // -------------------------------------------------------------------------
  // 1. Pick a due card (dueAt ≤ now), soonest first
  // -------------------------------------------------------------------------
  const dueProgress = await prisma.cardProgress.findFirst({
    where: {
      userId,
      dueAt: { lte: now },
      card: { deckId: deck.id, status: "PUBLISHED" },
    },
    orderBy: { dueAt: "asc" },
    select: { cardId: true },
  });

  if (dueProgress) {
    return fetchFullCard(dueProgress.cardId);
  }

  // -------------------------------------------------------------------------
  // 2. Pick a card the user has never seen (no CardProgress row)
  // -------------------------------------------------------------------------
  const seenIds = await prisma.cardProgress.findMany({
    where: { userId },
    select: { cardId: true },
  });
  const seenSet = new Set(seenIds.map((p) => p.cardId));

  const allIds = await prisma.card.findMany({
    where: { deckId: deck.id, status: "PUBLISHED" },
    select: { id: true },
  });

  const newIds = allIds.filter((c) => !seenSet.has(c.id)).map((c) => c.id);

  if (newIds.length > 0) {
    const picked = newIds[Math.floor(Math.random() * newIds.length)];
    return fetchFullCard(picked);
  }

  // -------------------------------------------------------------------------
  // 3. All cards reviewed, none due — show the next-soonest upcoming card
  // -------------------------------------------------------------------------
  const nextProgress = await prisma.cardProgress.findFirst({
    where: {
      userId,
      card: { deckId: deck.id, status: "PUBLISHED" },
    },
    orderBy: { dueAt: "asc" },
    select: { cardId: true },
  });

  if (nextProgress) {
    return fetchFullCard(nextProgress.cardId);
  }

  return null;
}

/**
 * Returns the number of cards currently due for `userId`.
 * Used on the home page to show a "X due" badge.
 *
 * @param userId - The authenticated user's database ID.
 * @returns Count of due cards.
 */
export async function getDueCount(userId: string): Promise<number> {
  return prisma.cardProgress.count({
    where: {
      userId,
      dueAt: { lte: new Date() },
      card: { status: "PUBLISHED" },
    },
  });
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function fetchFullCard(cardId: string): Promise<StudyCard | null> {
  const raw = await prisma.card.findUnique({
    where: { id: cardId },
    select: {
      id: true,
      type: true,
      question: true,
      answer: true,
      explanation: true,
      originalId: true,
      choices: { select: { id: true, text: true, isCorrect: true } },
      references: { select: { label: true, url: true }, take: 1 },
      tags: {
        where: { tag: { name: "flagged", type: TagType.CUSTOM } },
        select: { note: true, tag: { select: { name: true } } },
        take: 1,
      },
    },
  });
  if (!raw) return null;
  return mapRawCard(raw as RawCard);
}

function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function mapRawCard(raw: RawCard): StudyCard {
  const reference = raw.references[0]
    ? { label: raw.references[0].label, url: raw.references[0].url }
    : null;
  const flagged = raw.tags.length > 0;
  const flagNote = raw.tags[0]?.note ?? null;

  if (raw.type === "MULTIPLE_CHOICE") {
    const choices: StudyCardChoice[] = shuffleArray(
      raw.choices.map((c) => ({ id: c.id, text: c.text, isCorrect: c.isCorrect })),
    );
    return {
      id: raw.id,
      type: "MULTIPLE_CHOICE",
      question: raw.question,
      answer: raw.answer,
      explanation: raw.explanation,
      choices,
      reference,
      originalId: raw.originalId,
      flagged,
      flagNote,
    };
  }

  return {
    id: raw.id,
    type: "OPEN_ANSWER",
    question: raw.question,
    answer: raw.answer,
    explanation: raw.explanation,
    reference,
    originalId: raw.originalId,
    flagged,
    flagNote,
  };
}
