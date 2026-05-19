/**
 * @module lib/export/csv-formatter
 * Converts database card rows to a flat CSV string for spreadsheet review.
 * CSV export is read-only — it cannot be round-tripped through the importer.
 */

import type { ExportCard } from "./queries";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Wraps a value in double-quotes and escapes any embedded double-quotes. */
function cell(value: string | null | undefined): string {
  const s = value ?? "";
  return `"${s.replace(/"/g, '""')}"`;
}

/** Joins a row of cells with commas. */
function row(...values: (string | null | undefined)[]): string {
  return values.map(cell).join(",");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const HEADERS = [
  "id",
  "subject",
  "topic",
  "type",
  "difficulty",
  "status",
  "question",
  "answer",
  "explanation",
  "reference",
  "tags",
  "choices",
];

/**
 * Serialises a list of card rows as a UTF-8 CSV string with a header row.
 *
 * The `choices` column contains pipe-separated choice texts; correct choices
 * are prefixed with `*`. Example: `Option A | *Option B | Option C`
 *
 * @param subject - Deck name written into every row's `subject` column.
 * @param cards   - Card rows from the export query.
 */
export function formatCardsAsCsv(subject: string, cards: ExportCard[]): string {
  const lines: string[] = [row(...HEADERS)];

  for (const card of cards) {
    const topicTag = card.tags.find((ct) => ct.tag.type === "TOPIC");
    const tags = card.tags
      .filter((ct) => ct.tag.type !== "TOPIC" && ct.tag.name !== "flagged")
      .map((ct) => ct.tag.name)
      .join(", ");

    const ref = card.references[0];
    const reference = ref
      ? [ref.label, ref.documentName, ref.section].filter(Boolean).join(" — ")
      : null;

    const choices = card.choices
      .map((c) => (c.isCorrect ? `*${c.text}` : c.text))
      .join(" | ");

    lines.push(
      row(
        card.originalId ?? card.id,
        subject,
        topicTag?.tag.name ?? null,
        card.type === "MULTIPLE_CHOICE" ? "multiple_choice" : "open_answer",
        card.difficulty?.toLowerCase() ?? null,
        card.status.toLowerCase(),
        card.question,
        card.answer,
        card.explanation,
        reference,
        tags,
        choices || null,
      ),
    );
  }

  return lines.join("\r\n");
}
