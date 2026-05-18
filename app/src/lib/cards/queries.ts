/**
 * @module lib/cards/queries
 * Read-only data access for the card management feature.
 */

import { prisma } from "@/lib/db/client";
import { TagType } from "@/generated/prisma/enums";
import {
  DEFAULT_FILTERS,
  PAGE_SIZE,
  type CardDetail,
  type CardFilters,
  type CardListItem,
  type TagOption,
} from "./types";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Returns the ID of the first deck owned by userId, or null if none exists.
 * All card queries are scoped to this deck.
 */
async function getDeckId(userId: string): Promise<string | null> {
  const deck = await prisma.deck.findFirst({
    where: { createdByUserId: userId },
    select: { id: true },
  });
  return deck?.id ?? null;
}

// ---------------------------------------------------------------------------
// Public queries
// ---------------------------------------------------------------------------

/**
 * Returns a paginated, filtered list of cards for the card browser.
 * Filters are applied server-side; results include progress and flag state.
 */
export async function listCards(
  userId: string,
  filters: Partial<CardFilters> = {},
  pageSize = PAGE_SIZE,
): Promise<{ cards: CardListItem[]; total: number }> {
  const f: CardFilters = { ...DEFAULT_FILTERS, ...filters };

  const deckId = await getDeckId(userId);
  if (!deckId) return { cards: [], total: 0 };

  // Build where clause incrementally. TypeScript infers the type from the
  // first Prisma call below; we keep it as a plain object literal.
  const where = buildWhere(deckId, f);
  if (where === null) return { cards: [], total: 0 };

  const orderBy =
    f.sort === "question"
      ? { question: f.sortDir as "asc" | "desc" }
      : { createdAt: f.sortDir as "asc" | "desc" };

  const skip = (f.page - 1) * pageSize;

  const [rawCards, total] = await Promise.all([
    prisma.card.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
      select: {
        id: true,
        originalId: true,
        type: true,
        question: true,
        difficulty: true,
        status: true,
        createdAt: true,
        tags: {
          select: {
            note: true,
            tag: { select: { id: true, name: true, type: true } },
          },
        },
        progress: {
          where: { userId },
          select: { dueAt: true, reviewCount: true },
        },
      },
    }),
    prisma.card.count({ where }),
  ]);

  const cards: CardListItem[] = rawCards.map((raw) => {
    const flagCt = raw.tags.find(
      (ct) => ct.tag.name === "flagged" && ct.tag.type === TagType.CUSTOM,
    );
    return {
      id: raw.id,
      originalId: raw.originalId,
      type: raw.type,
      question: raw.question,
      difficulty: raw.difficulty,
      status: raw.status,
      flagged: !!flagCt,
      flagNote: flagCt?.note ?? null,
      tags: raw.tags
        .filter(
          (ct) =>
            !(ct.tag.name === "flagged" && ct.tag.type === TagType.CUSTOM),
        )
        .map((ct) => ({ id: ct.tag.id, name: ct.tag.name, type: ct.tag.type })),
      dueAt: raw.progress[0]?.dueAt ?? null,
      reviewCount: raw.progress[0]?.reviewCount ?? 0,
      createdAt: raw.createdAt,
    };
  });

  return { cards, total };
}

/**
 * Returns the full card detail for the edit page, or null if not found /
 * not owned by userId.
 */
export async function getCard(
  id: string,
  userId: string,
): Promise<CardDetail | null> {
  const deckId = await getDeckId(userId);
  if (!deckId) return null;

  const raw = await prisma.card.findFirst({
    where: { id, deckId },
    select: {
      id: true,
      originalId: true,
      type: true,
      question: true,
      answer: true,
      explanation: true,
      difficulty: true,
      status: true,
      deckId: true,
      createdAt: true,
      updatedAt: true,
      choices: {
        select: { id: true, text: true, isCorrect: true, sortOrder: true },
        orderBy: { sortOrder: "asc" },
      },
      tags: {
        select: {
          note: true,
          tag: { select: { id: true, name: true, type: true } },
        },
      },
      references: {
        select: {
          id: true,
          label: true,
          url: true,
          documentName: true,
          page: true,
          section: true,
          notes: true,
        },
      },
    },
  });
  if (!raw) return null;

  const flagCt = raw.tags.find(
    (ct) => ct.tag.name === "flagged" && ct.tag.type === TagType.CUSTOM,
  );

  return {
    id: raw.id,
    originalId: raw.originalId,
    type: raw.type,
    question: raw.question,
    answer: raw.answer,
    explanation: raw.explanation,
    difficulty: raw.difficulty,
    status: raw.status,
    deckId: raw.deckId,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    choices: raw.choices,
    references: raw.references,
    tags: raw.tags
      .filter(
        (ct) =>
          !(ct.tag.name === "flagged" && ct.tag.type === TagType.CUSTOM),
      )
      .map((ct) => ({
        id: ct.tag.id,
        name: ct.tag.name,
        type: ct.tag.type,
      })),
    flagged: !!flagCt,
    flagNote: flagCt?.note ?? null,
  };
}

/**
 * Returns all tags except the internal "flagged" marker, sorted by type then name.
 * Used to populate the TagSelector in the card form.
 */
export async function listTags(): Promise<TagOption[]> {
  return prisma.tag.findMany({
    where: {
      NOT: { name: "flagged", type: TagType.CUSTOM },
    },
    orderBy: [{ type: "asc" }, { name: "asc" }],
    select: { id: true, name: true, type: true },
  });
}

// ---------------------------------------------------------------------------
// Internal: where clause builder
// ---------------------------------------------------------------------------

/**
 * Builds the Prisma `where` input for card queries.
 * Returns null if the filters would guarantee zero results (e.g. flaggedOnly
 * but the flagged tag doesn't exist yet).
 */
function buildWhere(
  deckId: string,
  f: CardFilters,
): Record<string, unknown> | null {
  const where: Record<string, unknown> = { deckId };

  if (f.search) {
    where.OR = [
      { question: { contains: f.search, mode: "insensitive" } },
      { answer: { contains: f.search, mode: "insensitive" } },
    ];
  }
  if (f.type !== "ALL") where.type = f.type;
  if (f.difficulty !== "ALL") where.difficulty = f.difficulty;
  if (f.status !== "ALL") where.status = f.status;

  if (f.flaggedOnly) {
    // Inline async is not allowed here — callers must resolve the flagged tag
    // separately. We use a sentinel tag name that Prisma will match on.
    where.tags = {
      some: { tag: { name: "flagged", type: TagType.CUSTOM } },
    };
  } else if (f.tagIds.length > 0) {
    where.tags = { some: { tagId: { in: f.tagIds } } };
  }

  return where;
}
