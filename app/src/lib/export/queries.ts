/**
 * @module lib/export/queries
 * Prisma queries for the export feature. All queries return the full card
 * shape needed by both the JSON and CSV formatters.
 */

import { prisma } from "@/lib/db/client";

// ---------------------------------------------------------------------------
// Shared include — used by all export queries
// ---------------------------------------------------------------------------

const cardInclude = {
  choices: { orderBy: { sortOrder: "asc" as const } },
  tags: { include: { tag: true } },
  references: true,
} as const;

/** Full card row as returned by export queries. */
export type ExportCard = Awaited<ReturnType<typeof getCardsForDeck>>[number];

// ---------------------------------------------------------------------------
// Deck queries
// ---------------------------------------------------------------------------

/**
 * Returns all decks the given user owns, ordered by name.
 * Used to populate the deck list on the /export page.
 */
export async function getDecksForUser(userId: string) {
  return prisma.deck.findMany({
    where: { createdByUserId: userId },
    select: {
      id: true,
      name: true,
      _count: { select: { cards: true } },
    },
    orderBy: { name: "asc" },
  });
}

/**
 * Returns all cards in a deck with their choices, tags, and references.
 * Ordered by originalId (alphabetical) for deterministic output.
 *
 * @param tagIds - When non-empty, only cards that have at least one of these
 *   tags are returned. Pass an empty array to return all cards.
 */
export async function getCardsForDeck(deckId: string, tagIds: string[] = []) {
  return prisma.card.findMany({
    where: {
      deckId,
      ...(tagIds.length > 0 && { tags: { some: { tagId: { in: tagIds } } } }),
    },
    include: cardInclude,
    orderBy: { originalId: "asc" },
  });
}

/**
 * Returns only cards that are new or changed since they were first imported:
 *
 * - New cards: `originalId IS NULL` (created inside the app, not from a JSON file).
 * - Changed cards: have at least one `CardRevision` (edited after import).
 *
 * The result can be re-imported to update `data/questions/` for the next deploy.
 *
 * @param tagIds - When non-empty, further filters to cards matching those tags.
 */
export async function getDiffCardsForDeck(deckId: string, tagIds: string[] = []) {
  return prisma.card.findMany({
    where: {
      deckId,
      OR: [
        { originalId: null },
        { revisions: { some: {} } },
      ],
      ...(tagIds.length > 0 && { tags: { some: { tagId: { in: tagIds } } } }),
    },
    include: cardInclude,
    orderBy: { originalId: "asc" },
  });
}

// ---------------------------------------------------------------------------
// User query (ADMIN export)
// ---------------------------------------------------------------------------

/** Returns all users ordered by creation date. Used for the admin user export. */
export async function getAllUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
}
