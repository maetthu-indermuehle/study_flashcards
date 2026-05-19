/**
 * @module importer/json-parser
 * Parses JSON question files into {@link ParsedCard} records.
 *
 * The expected input format is a plain JSON array of card objects as defined
 * in `docs/question_generation_guide.md`. This is the only import format the
 * app supports — Markdown files are converted to JSON by the one-off migration
 * script at `scripts/md_to_json.ts` before being imported.
 *
 * Zod is used for structural validation so the caller receives a typed result
 * or a descriptive error message rather than a runtime crash downstream.
 */

import { z } from "zod";
import type { ParsedCard, ParsedBatch } from "./types";

// ---------------------------------------------------------------------------
// Zod schema — mirrors the canonical format from question_generation_guide.md
// ---------------------------------------------------------------------------

const choiceSchema = z.object({
  text: z.string().min(1, "Choice text must not be empty"),
  correct: z.boolean(),
});

const mediaSchema = z.object({
  kind: z.enum(["image", "table", "graph", "video", "pdf_excerpt", "other"]),
  role: z.enum(["question_context", "answer_explanation", "reference"]),
  src: z.string().min(1, "Media src must not be empty"),
  alt: z.string().min(1, "Media alt must not be empty"),
  caption: z.string().optional(),
  attribution: z.string().optional(),
  origin: z.string().optional(),
});

const cardSchema = z.object({
  id: z.string().min(1, "Card id must not be empty"),
  topic: z.string().nullable(),
  type: z.enum(["multiple_choice", "open_answer"]),
  difficulty: z.enum(["easy", "medium", "hard"]).nullable(),
  tags: z.array(z.string()),
  question: z.string().min(1, "Question text must not be empty"),
  // choices is absent on open_answer cards — undefined is treated as empty array.
  choices: z.array(choiceSchema).optional(),
  answer: z.string().min(1, "Answer must not be empty"),
  explanation: z.string().nullable(),
  reference: z.string().nullable(),
  media: z.array(mediaSchema).optional(),
});

/** Legacy format: bare array of cards. */
const fileSchema = z.array(cardSchema);

/**
 * New wrapper format: `{ "subject": "...", "cards": [...] }`.
 * The subject is used as the deck name during import.
 */
const batchWrapperSchema = z.object({
  subject: z.string().min(1, "Subject must not be empty"),
  cards: z.array(cardSchema),
});

// ---------------------------------------------------------------------------
// Difficulty mapping — JSON lowercase → Prisma CardDifficulty enum
// ---------------------------------------------------------------------------

const difficultyMap = {
  easy: "EASY",
  medium: "MEDIUM",
  hard: "HARD",
} as const satisfies Record<string, "EASY" | "MEDIUM" | "HARD">;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Maps a validated Zod card result to the typed {@link ParsedCard} shape. */
function mapCards(
  raw: z.infer<typeof fileSchema>,
): ParsedCard[] {
  return raw.map((card) => ({
    sourceId: card.id,
    topic: card.topic,
    cardType: card.type === "multiple_choice" ? "MULTIPLE_CHOICE" : "OPEN_ANSWER",
    difficulty: card.difficulty ? difficultyMap[card.difficulty] : null,
    tags: card.tags,
    questionText: card.question,
    choices: (card.choices ?? []).map((c) => ({
      text: c.text,
      isCorrect: c.correct,
    })),
    answerText: card.answer,
    explanation: card.explanation,
    reference: card.reference,
    media: (card.media ?? []).map((m) => ({
      kind: m.kind,
      role: m.role,
      src: m.src,
      alt: m.alt,
      ...(m.caption !== undefined && { caption: m.caption }),
      ...(m.attribution !== undefined && { attribution: m.attribution }),
      ...(m.origin !== undefined && { origin: m.origin }),
    })),
  }));
}

/** Formats up to five Zod issues into a human-readable string. */
function formatZodIssues(error: z.ZodError): string {
  return error.issues
    .slice(0, 5)
    .map((i) => `  [${i.path.join(".")}] ${i.message}`)
    .join("\n");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parses a JSON string in either the new wrapper format or the legacy bare-
 * array format, returning a {@link ParsedBatch} with an optional subject.
 *
 * **New format** (preferred):
 * ```json
 * { "subject": "Canadian PPL", "cards": [ ...card objects... ] }
 * ```
 *
 * **Legacy format** (still supported, subject will be `null`):
 * ```json
 * [ ...card objects... ]
 * ```
 *
 * Structural validation is performed with Zod; semantic validation is
 * handled separately by the validator module.
 *
 * @param jsonString - Raw JSON string.
 * @returns {@link ParsedBatch} with `subject` and `cards`.
 * @throws {Error} If `jsonString` is not valid JSON.
 * @throws {Error} If the parsed value does not conform to either schema.
 */
export function parseJsonBatch(jsonString: string): ParsedBatch {
  let raw: unknown;
  try {
    raw = JSON.parse(jsonString);
  } catch (cause) {
    throw new Error(`Invalid JSON: ${(cause as Error).message}`, { cause });
  }

  // Legacy format: bare array.
  if (Array.isArray(raw)) {
    const result = fileSchema.safeParse(raw);
    if (!result.success) {
      throw new Error(`JSON does not match the card format:\n${formatZodIssues(result.error)}`);
    }
    return { subject: null, cards: mapCards(result.data) };
  }

  // New format: wrapper object with subject and cards array.
  const result = batchWrapperSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `JSON does not match the expected format (array or {subject, cards} object):\n${formatZodIssues(result.error)}`,
    );
  }
  return { subject: result.data.subject, cards: mapCards(result.data.cards) };
}

/**
 * Parses a JSON string containing a bare array of card objects.
 *
 * This is the legacy entry point used by the CLI script and seed. For new
 * code, prefer {@link parseJsonBatch} which handles both formats.
 *
 * @param jsonString - Raw JSON string. Must be a top-level array.
 * @returns Array of {@link ParsedCard} objects.
 * @throws {Error} If the input is not valid JSON or does not match the schema.
 *
 * @example
 * ```ts
 * const cards = parseJsonCards(await fs.readFile("questions.json", "utf8"));
 * // cards[0].cardType === "MULTIPLE_CHOICE"
 * ```
 */
export function parseJsonCards(jsonString: string): ParsedCard[] {
  return parseJsonBatch(jsonString).cards;
}
