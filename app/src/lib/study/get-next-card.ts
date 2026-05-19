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
  tags: { note: string | null; tag: { name: string; type: string } }[];
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the next card to study for `userId`, applying due-card-first logic.
 *
 * When `tagIds` is provided and non-empty, only cards that carry at least one
 * of those tags are considered. An empty or omitted `tagIds` means all cards.
 *
 * When `dueOnly` is true the function only returns due cards (step 1) and
 * returns `null` when none are due — it does not fall back to new or upcoming
 * cards. This powers the "review due cards only" mode.
 *
 * @param userId  - The authenticated user's database ID.
 * @param tagIds  - Optional list of Tag IDs to restrict the selection to.
 * @param dueOnly - When true, only return cards that are currently due.
 * @returns A shuffled {@link StudyCard}, or `null` when nothing matches.
 */
export async function getNextCard(
  userId: string,
  tagIds?: string[],
  dueOnly?: boolean,
): Promise<StudyCard | null> {
  // Find all decks owned by this user — cards may span multiple subjects.
  const decks = await prisma.deck.findMany({
    where: { createdByUserId: userId },
    select: { id: true },
  });
  if (decks.length === 0) return null;
  const deckIds = decks.map((d) => d.id);

  // Tag filter clause — applied to every card lookup below.
  const tagFilter =
    tagIds && tagIds.length > 0
      ? { tags: { some: { tagId: { in: tagIds } } } }
      : {};

  const now = new Date();

  // -------------------------------------------------------------------------
  // 1. Pick a due card (dueAt ≤ now), soonest first
  // -------------------------------------------------------------------------
  const dueProgress = await prisma.cardProgress.findFirst({
    where: {
      userId,
      dueAt: { lte: now },
      card: { deckId: { in: deckIds }, status: "PUBLISHED", ...tagFilter },
    },
    orderBy: { dueAt: "asc" },
    select: { cardId: true },
  });

  if (dueProgress) {
    return fetchFullCard(dueProgress.cardId);
  }

  // In dueOnly mode stop here — don't fall back to new or upcoming cards.
  if (dueOnly) return null;

  // -------------------------------------------------------------------------
  // 2. Pick a card the user has never seen (no CardProgress row)
  // -------------------------------------------------------------------------
  const seenIds = await prisma.cardProgress.findMany({
    where: { userId },
    select: { cardId: true },
  });
  const seenSet = new Set(seenIds.map((p) => p.cardId));

  const allIds = await prisma.card.findMany({
    where: { deckId: { in: deckIds }, status: "PUBLISHED", ...tagFilter },
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
      card: { deckId: { in: deckIds }, status: "PUBLISHED", ...tagFilter },
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
 * When `tagIds` is provided, only counts due cards matching those tags.
 */
export async function getDueCount(userId: string, tagIds?: string[]): Promise<number> {
  const decks = await prisma.deck.findMany({
    where: { createdByUserId: userId },
    select: { id: true },
  });
  const deckIds = decks.map((d) => d.id);

  const tagFilter =
    tagIds && tagIds.length > 0
      ? { tags: { some: { tagId: { in: tagIds } } } }
      : {};

  return prisma.cardProgress.count({
    where: {
      userId,
      dueAt: { lte: new Date() },
      card: { deckId: { in: deckIds }, status: "PUBLISHED", ...tagFilter },
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
        select: { note: true, tag: { select: { name: true, type: true } } },
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

  const flagTag = raw.tags.find(
    (t) => t.tag.type === TagType.CUSTOM && t.tag.name === "flagged",
  );
  const flagged = flagTag !== undefined;
  const flagNote = flagTag?.note ?? null;

  const topics = raw.tags
    .filter((t) => t.tag.type === TagType.TOPIC)
    .map((t) => t.tag.name);

  const tags = raw.tags
    .filter((t) => t.tag.type === TagType.CUSTOM && t.tag.name !== "flagged")
    .map((t) => t.tag.name);

  const shared = { id: raw.id, question: raw.question, answer: raw.answer,
    explanation: raw.explanation, reference, originalId: raw.originalId,
    flagged, flagNote, topics, tags };

  if (raw.type === "MULTIPLE_CHOICE") {
    const choices: StudyCardChoice[] = shuffleArray(
      raw.choices.map((c) => ({ id: c.id, text: c.text, isCorrect: c.isCorrect })),
    );
    return { ...shared, type: "MULTIPLE_CHOICE", choices };
  }

  return { ...shared, type: "OPEN_ANSWER" };
}
