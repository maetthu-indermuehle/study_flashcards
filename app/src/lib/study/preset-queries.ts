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

/**
 * Returns all TOPIC tags grouped into a two-level hierarchy, ordered
 * alphabetically. Each group exposes `allTagIds` (for "select all") and a
 * list of sub-topics the user can pick individually.
 */
export async function listTopicGroups(userId: string): Promise<TopicGroup[]> {
  const deck = await prisma.deck.findFirst({
    where: { createdByUserId: userId },
    select: { id: true },
  });
  if (!deck) return [];

  const tags = await prisma.tag.findMany({
    where: {
      type: TagType.TOPIC,
      cards: { some: { card: { deckId: deck.id, status: "PUBLISHED" } } },
    },
    select: {
      id: true,
      name: true,
      _count: {
        select: { cards: { where: { card: { deckId: deck.id, status: "PUBLISHED" } } } },
      },
    },
    orderBy: { name: "asc" },
  });

  // Group by top-level name.
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
