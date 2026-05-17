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
import type { ParsedCard } from "./types";

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

const fileSchema = z.array(cardSchema);

// ---------------------------------------------------------------------------
// Difficulty mapping — JSON lowercase → Prisma CardDifficulty enum
// ---------------------------------------------------------------------------

const difficultyMap = {
  easy: "EASY",
  medium: "MEDIUM",
  hard: "HARD",
} as const satisfies Record<string, "EASY" | "MEDIUM" | "HARD">;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parses a JSON string containing an array of card objects into
 * {@link ParsedCard} records.
 *
 * The input must conform to the format defined in
 * `docs/question_generation_guide.md`. Structural validation is performed
 * with Zod; semantic validation (missing answers, duplicate IDs, etc.) is
 * handled separately by the validator module.
 *
 * @param jsonString - Raw JSON string. Must be a top-level array; objects,
 *   primitives, and other non-array values are rejected.
 * @returns Array of {@link ParsedCard} objects. Empty if the input array is
 *   empty (`"[]"`).
 * @throws {Error} If `jsonString` is not valid JSON.
 * @throws {Error} If the parsed value does not conform to the card schema.
 *   The message includes the first five Zod issues with field paths to help
 *   locate problems in large files.
 *
 * @example
 * ```ts
 * const cards = parseJsonCards(await fs.readFile("questions.json", "utf8"));
 * // cards[0].cardType === "MULTIPLE_CHOICE"
 * // cards[0].difficulty === "EASY"
 * ```
 */
export function parseJsonCards(jsonString: string): ParsedCard[] {
  let raw: unknown;
  try {
    raw = JSON.parse(jsonString);
  } catch (cause) {
    throw new Error(`Invalid JSON: ${(cause as Error).message}`, { cause });
  }

  const result = fileSchema.safeParse(raw);
  if (!result.success) {
    // Report the first few issues so the caller can fix them without being overwhelmed.
    const issues = result.error.issues
      .slice(0, 5)
      .map((i) => `  [${i.path.join(".")}] ${i.message}`)
      .join("\n");
    throw new Error(`JSON does not match the card format:\n${issues}`);
  }

  return result.data.map((card) => ({
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
