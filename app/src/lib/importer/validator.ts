/**
 * @module importer/validator
 * Semantic validation for parsed card batches.
 *
 * The JSON parser checks structural correctness (valid JSON, required fields
 * present, correct types). This module checks semantic correctness: do the
 * values make sense as study content? It never throws — it returns a list of
 * {@link ValidationError} records so the caller can decide whether to abort,
 * warn, or proceed.
 *
 * Severity levels:
 * - `"error"` — the card cannot be studied or imported correctly. The CLI
 *   will abort by default unless `--force` is passed.
 * - `"warning"` — the card is usable but incomplete. The CLI reports it and
 *   continues.
 */

import type { ParsedCard } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Identifies the rule that produced a {@link ValidationError}.
 *
 * - `EMPTY_QUESTION` — question text is blank.
 * - `MISSING_ANSWER` — answer text is blank.
 * - `NO_CORRECT_CHOICE` — a multiple-choice card has no choice with `isCorrect: true`.
 * - `MISSING_REFERENCE` — no source reference was provided.
 * - `DUPLICATE_SOURCE_ID` — the same `sourceId` appears more than once in the batch.
 */
export type ValidationErrorCode =
  | "EMPTY_QUESTION"
  | "MISSING_ANSWER"
  | "NO_CORRECT_CHOICE"
  | "MISSING_REFERENCE"
  | "DUPLICATE_SOURCE_ID";

/**
 * Whether a validation problem blocks import or is merely advisory.
 *
 * - `"error"` — the card is unstudyable or the batch is inconsistent.
 * - `"warning"` — the card works but is incomplete (e.g. missing reference).
 */
export type ValidationSeverity = "error" | "warning";

/**
 * A single validation problem found in a {@link ParsedCard} batch.
 */
export type ValidationError = {
  /** Machine-readable identifier for the rule that fired. */
  code: ValidationErrorCode;
  /** The `sourceId` of the card that triggered the error. */
  sourceId: string;
  /** Human-readable description of the problem. */
  message: string;
  /** Whether this blocks import (`"error"`) or is advisory (`"warning"`). */
  severity: ValidationSeverity;
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validates a batch of parsed cards for semantic correctness.
 *
 * Runs both per-card checks and cross-card checks (duplicate IDs). Returns
 * all problems found — does not stop at the first error.
 *
 * @param cards - Array of {@link ParsedCard} objects produced by a parser.
 * @returns Array of {@link ValidationError} records. Empty if the batch is
 *   valid. Errors precede warnings in the output.
 *
 * @example
 * ```ts
 * const errors = validate(cards);
 * const hasBlockers = errors.some(e => e.severity === "error");
 * if (hasBlockers) process.exit(1);
 * ```
 */
export function validate(cards: ParsedCard[]): ValidationError[] {
  const errors: ValidationError[] = [];

  // --- Cross-card checks ---------------------------------------------------

  // Track the first index at which each sourceId is seen so the duplicate
  // message can tell the user exactly where the collision is.
  const seen = new Map<string, number>();

  for (let i = 0; i < cards.length; i++) {
    const { sourceId } = cards[i];
    if (seen.has(sourceId)) {
      errors.push({
        code: "DUPLICATE_SOURCE_ID",
        sourceId,
        message: `Duplicate sourceId "${sourceId}" at index ${i} (first seen at index ${seen.get(sourceId)}).`,
        severity: "error",
      });
    } else {
      seen.set(sourceId, i);
    }
  }

  // --- Per-card checks -----------------------------------------------------

  for (const card of cards) {
    if (!card.questionText.trim()) {
      errors.push({
        code: "EMPTY_QUESTION",
        sourceId: card.sourceId,
        message: "Question text is empty.",
        severity: "error",
      });
    }

    if (!card.answerText.trim()) {
      errors.push({
        code: "MISSING_ANSWER",
        sourceId: card.sourceId,
        message: "Answer text is empty.",
        severity: "error",
      });
    }

    if (
      card.cardType === "MULTIPLE_CHOICE" &&
      !card.choices.some((c) => c.isCorrect)
    ) {
      errors.push({
        code: "NO_CORRECT_CHOICE",
        sourceId: card.sourceId,
        message: "Multiple-choice card has no correct choice.",
        severity: "error",
      });
    }

    if (!card.reference) {
      errors.push({
        code: "MISSING_REFERENCE",
        sourceId: card.sourceId,
        message: "No source reference provided.",
        severity: "warning",
      });
    }
  }

  return errors;
}
