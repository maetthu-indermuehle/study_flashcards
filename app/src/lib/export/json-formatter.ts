/**
 * @module lib/export/json-formatter
 * Converts database card rows into the canonical import JSON format defined in
 * docs/question_generation_guide.md. The output is round-trip compatible with
 * the JSON importer — exporting and re-importing produces an idempotent upsert.
 */

import type { ExportCard } from "./queries";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Maps the Prisma CardDifficulty enum to the lowercase JSON format. */
function formatDifficulty(d: string | null): "easy" | "medium" | "hard" | null {
  if (!d) return null;
  return d.toLowerCase() as "easy" | "medium" | "hard";
}

/** Maps the Prisma CardType enum to the lowercase JSON format. */
function formatType(t: string): "multiple_choice" | "open_answer" {
  return t === "MULTIPLE_CHOICE" ? "multiple_choice" : "open_answer";
}

/**
 * Converts a single card row to the canonical JSON card object.
 *
 * Tags with type TOPIC are promoted to the top-level `topic` field (first one
 * wins). The "flagged" custom tag is excluded from the `tags` array — it is
 * an app-internal marker, not subject content.
 */
function formatCard(card: ExportCard): object {
  const topicTag = card.tags.find((ct) => ct.tag.type === "TOPIC");
  const tags = card.tags
    .filter((ct) => ct.tag.type !== "TOPIC" && ct.tag.name !== "flagged")
    .map((ct) => ct.tag.name);

  // SourceReference: join label + document name into a single reference string
  // matching the format the importer expects in the `reference` field.
  const ref = card.references[0];
  const reference = ref
    ? [ref.label, ref.documentName, ref.section]
        .filter(Boolean)
        .join(" — ") || null
    : null;

  const base = {
    id: card.originalId ?? card.id,
    topic: topicTag?.tag.name ?? null,
    type: formatType(card.type),
    difficulty: formatDifficulty(card.difficulty),
    tags,
    question: card.question,
    answer: card.answer,
    explanation: card.explanation ?? null,
    reference,
  };

  if (card.type !== "MULTIPLE_CHOICE") return base;

  return {
    ...base,
    choices: card.choices.map((c) => ({ text: c.text, correct: c.isCorrect })),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Serialises a list of card rows as a pretty-printed import JSON string.
 * The output uses the `{ "subject": "...", "cards": [...] }` wrapper format.
 *
 * @param subject - Deck name (becomes the `subject` field).
 * @param cards   - Card rows from the export query.
 * @returns Pretty-printed JSON string ready for download or file write.
 */
export function formatCardsAsJson(subject: string, cards: ExportCard[]): string {
  return JSON.stringify(
    { subject, cards: cards.map(formatCard) },
    null,
    2,
  );
}
