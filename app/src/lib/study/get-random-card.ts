/**
 * @module study/get-random-card
 * Data access for the study flow: fetch one random published card from the
 * user's deck, shuffle its choices, and return a typed StudyCard.
 */

import { prisma } from "@/lib/db/client";
import type { StudyCard, StudyCardChoice } from "./types";

// ---------------------------------------------------------------------------
// Internal types — raw Prisma result shapes
// ---------------------------------------------------------------------------

type RawChoice = {
  id: string;
  text: string;
  isCorrect: boolean;
};

type RawReference = {
  label: string;
  url: string | null;
};

type RawCard = {
  id: string;
  type: "MULTIPLE_CHOICE" | "OPEN_ANSWER";
  question: string;
  answer: string;
  explanation: string | null;
  choices: RawChoice[];
  references: RawReference[];
};

// ---------------------------------------------------------------------------
// Pure helpers (exported for unit testing)
// ---------------------------------------------------------------------------

/**
 * Fisher-Yates in-place shuffle. Returns the same array mutated.
 * Exported for unit testing only — not part of the public module API.
 *
 * @param arr - The array to shuffle in place.
 * @returns The shuffled array (same reference).
 */
export function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Maps a raw Prisma card result to a typed {@link StudyCard}.
 * Choices are shuffled before mapping.
 * Exported for unit testing only — not part of the public module API.
 *
 * @param raw - Raw card data from Prisma.
 * @returns A fully typed StudyCard.
 */
export function mapRawCardToStudyCard(raw: RawCard): StudyCard {
  const reference = raw.references[0]
    ? { label: raw.references[0].label, url: raw.references[0].url }
    : null;

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
      originalId: null,
      flagged: false,
      flagNote: null,
    };
  }

  return {
    id: raw.id,
    type: "OPEN_ANSWER",
    question: raw.question,
    answer: raw.answer,
    explanation: raw.explanation,
    reference,
    originalId: null,
    flagged: false,
    flagNote: null,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns one random published card from the first deck owned by `userId`.
 *
 * Strategy: fetch all published card IDs from the user's deck, pick one at
 * random, then fetch the full card with choices and one source reference.
 * With ~926 cards, fetching all IDs is cheap (~10 KB). This avoids loading
 * full card data for cards that won't be shown.
 *
 * @param userId - The authenticated user's database ID.
 * @returns A shuffled {@link StudyCard}, or `null` if no published cards exist.
 */
export async function getRandomCard(userId: string): Promise<StudyCard | null> {
  const deck = await prisma.deck.findFirst({
    where: { createdByUserId: userId },
    select: { id: true },
  });
  if (!deck) return null;

  const ids = await prisma.card.findMany({
    where: { deckId: deck.id, status: "PUBLISHED" },
    select: { id: true },
  });
  if (ids.length === 0) return null;

  const randomId = ids[Math.floor(Math.random() * ids.length)].id;

  const raw = await prisma.card.findUnique({
    where: { id: randomId },
    select: {
      id: true,
      type: true,
      question: true,
      answer: true,
      explanation: true,
      choices: {
        select: { id: true, text: true, isCorrect: true },
      },
      references: {
        select: { label: true, url: true },
        take: 1,
      },
    },
  });
  if (!raw) return null;

  return mapRawCardToStudyCard(raw as RawCard);
}
