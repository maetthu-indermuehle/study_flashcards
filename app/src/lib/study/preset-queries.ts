/**
 * @module study/preset-queries
 * Read-only queries for study presets and the grouped topic list used on the
 * setup page.
 *
 * Topic tags follow a naming convention that encodes the hierarchy:
 *   "Meteorology"                          — top-level group
 *   "Meteorology - Canadian Weather Products"  — sub-topic (hyphen separator)
 *   "Air Law — Airspace"                   — sub-topic (em-dash separator)
 *
 * `listTopicGroups` parses this convention and returns a two-level tree so
 * the UI can show groups with expand/collapse and per-sub-topic checkboxes.
 */

import { prisma } from "@/lib/db/client";
import { TagType } from "../../generated/prisma/enums";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SubTopic = {
  id: string;
  /** Display label — the part of the tag name after the separator. */
  label: string;
  cardCount: number;
};

export type TopicGroup = {
  /** Top-level category name, e.g. "Meteorology" or "Air Law". */
  name: string;
  /** All tag IDs that belong to this group (used for "select all"). */
  allTagIds: string[];
  /** Total distinct cards across all tags in this group. */
  totalCards: number;
  /** Sub-topic entries (tags whose name contains a separator). */
  subTopics: SubTopic[];
};

export type PresetItem = {
  id: string;
  name: string;
  tagIds: string[];
  isShared: boolean;
  isOwn: boolean;
};

/**
 * A deck (= subject, e.g. "Canadian PPL") containing its topic groups.
 * Used as the top-level item in the three-level study setup accordion.
 */
export type SubjectGroup = {
  /** Database ID of the deck. */
  deckId: string;
  /** Deck name, used as the subject label in the UI (e.g. "Canadian PPL"). */
  name: string;
  /** Topic groups belonging to this deck. */
  topicGroups: TopicGroup[];
  /** All tag IDs across every topic group in this subject (for "select all"). */
  allTagIds: string[];
  /** Approximate total card count (sum across topic groups). */
  totalCards: number;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extracts the top-level category name from a TOPIC tag name. */
function groupName(tagName: string): string {
  const idx = Math.min(
    tagName.includes(" — ") ? tagName.indexOf(" — ") : Infinity,
    tagName.includes(" - ") ? tagName.indexOf(" - ") : Infinity,
  );
  return idx === Infinity ? tagName.trim() : tagName.slice(0, idx).trim();
}

/** Returns the label to show for a sub-topic (part after the separator). */
function subLabel(tagName: string): string | null {
  for (const sep of [" — ", " - "]) {
    const idx = tagName.indexOf(sep);
    if (idx > 0) return tagName.slice(idx + sep.length).trim();
  }
  return null;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Returns the two-level topic group hierarchy for a single deck.
 * Factored out so both `listTopicGroups` and `listSubjectGroups` can call it.
 */
async function topicGroupsForDeck(deckId: string): Promise<TopicGroup[]> {
  const tags = await prisma.tag.findMany({
    where: {
      type: TagType.TOPIC,
      cards: { some: { card: { deckId, status: "PUBLISHED" } } },
    },
    select: {
      id: true,
      name: true,
      _count: {
        select: { cards: { where: { card: { deckId, status: "PUBLISHED" } } } },
      },
    },
    orderBy: { name: "asc" },
  });

  const map = new Map<string, { tagIds: string[]; subTopics: SubTopic[]; cardCount: number }>();

  for (const tag of tags) {
    const group = groupName(tag.name);
    if (!map.has(group)) map.set(group, { tagIds: [], subTopics: [], cardCount: 0 });
    const entry = map.get(group)!;
    const label = subLabel(tag.name);

    entry.tagIds.push(tag.id);
    // Approximate total by summing per-tag card counts (cards with multiple
    // tags in the group may be counted more than once, but it's close enough
    // for display purposes).
    entry.cardCount += tag._count.cards;

    if (label) {
      entry.subTopics.push({ id: tag.id, label, cardCount: tag._count.cards });
    }
    // Tags whose name equals the group name (no separator) are root tags —
    // included in allTagIds but not shown as a separate sub-topic row.
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, entry]) => ({
      name,
      allTagIds: entry.tagIds,
      totalCards: entry.cardCount,
      subTopics: entry.subTopics,
    }));
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Returns the topic groups for the user's first deck.
 *
 * @deprecated Prefer {@link listSubjectGroups} which covers all decks and
 *   exposes the subject (deck) label as the top-level item.
 */
export async function listTopicGroups(userId: string): Promise<TopicGroup[]> {
  const deck = await prisma.deck.findFirst({
    where: { createdByUserId: userId },
    select: { id: true },
  });
  if (!deck) return [];
  return topicGroupsForDeck(deck.id);
}

/**
 * Returns all decks owned by `userId` as {@link SubjectGroup} items, each
 * containing the two-level topic hierarchy for that deck.
 *
 * Decks are ordered alphabetically. The UI collapses the subject level when
 * the user has only one deck so existing single-subject flows are unchanged.
 */
export async function listSubjectGroups(userId: string): Promise<SubjectGroup[]> {
  const decks = await prisma.deck.findMany({
    where: { createdByUserId: userId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const result: SubjectGroup[] = [];

  for (const deck of decks) {
    const topicGroups = await topicGroupsForDeck(deck.id);
    const allTagIds = topicGroups.flatMap((g) => g.allTagIds);
    const totalCards = topicGroups.reduce((sum, g) => sum + g.totalCards, 0);
    result.push({ deckId: deck.id, name: deck.name, topicGroups, allTagIds, totalCards });
  }

  return result;
}

/**
 * Returns all study presets visible to `userId`:
 *   - presets owned by the user, plus
 *   - presets marked as shared by other users.
 * Own presets come first, then shared ones sorted alphabetically.
 */
export async function listPresets(userId: string): Promise<PresetItem[]> {
  const rows = await prisma.studyPreset.findMany({
    where: { OR: [{ userId }, { isShared: true }] },
    select: { id: true, name: true, tagIds: true, isShared: true, userId: true },
    orderBy: [{ userId: "asc" }, { name: "asc" }],
  });

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    tagIds: Array.isArray(r.tagIds) ? (r.tagIds as string[]) : [],
    isShared: r.isShared,
    isOwn: r.userId === userId,
  }));
}
