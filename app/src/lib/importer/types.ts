/**
 * @module importer/types
 * Shared types produced by all parsers and consumed by the validator and
 * import service. The field names mirror the canonical JSON format defined
 * in docs/question_generation_guide.md.
 */

/**
 * A single answer choice extracted from a multiple-choice question.
 * Choices have no display order — the app randomises the order at study time.
 */
export type ParsedChoice = {
  /** Display text shown to the user. */
  text: string;
  /**
   * Whether this is a correct answer. Multiple choices may be correct,
   * supporting "select all that apply" question types.
   */
  isCorrect: boolean;
};

/**
 * A media asset referenced by a card.
 * At import time the asset is not downloaded or validated — only the metadata
 * is stored. Phase 7 wires up actual file serving and storage.
 */
export type ParsedMedia = {
  /**
   * What the asset is.
   * Maps to the `MediaKind` Prisma enum.
   */
  kind: "image" | "table" | "graph" | "video" | "pdf_excerpt" | "other";
  /**
   * Where on the card the asset appears.
   * Maps to the `MediaRole` Prisma enum.
   */
  role: "question_context" | "answer_explanation" | "reference";
  /**
   * Source of the asset: an absolute URL or a relative path from the JSON
   * file's directory. Paths prefixed with `assets/TODO-` are placeholders
   * to be resolved when the actual file is sourced.
   */
  src: string;
  /** Plain-text description for accessibility and search indexing. */
  alt: string;
  /** Short display caption shown below the rendered asset. */
  caption?: string;
  /**
   * Credit line for the attribution page: author, license, and title.
   * Examples: `"Transport Canada, Crown Copyright"`,
   * `"Wikimedia Commons / Kogo, CC BY-SA 2.5"`.
   * Maps to `MediaAsset.sourceLabel` in the database.
   */
  attribution?: string;
  /**
   * Where the asset was obtained — a URL or bibliographic note — so it can
   * be found again for review or update.
   * Maps to `MediaAsset.sourceUrl` in the database.
   */
  origin?: string;
};

/**
 * A parsed JSON batch: the optional subject wrapper plus all cards.
 *
 * Produced by {@link parseJsonBatch}. The `subject` field is taken from the
 * `{"subject": "...", "cards": [...]}` wrapper when present; it is `null`
 * when the file uses the legacy bare-array format.
 */
export type ParsedBatch = {
  /**
   * Top-level subject label from the JSON wrapper (e.g. `"Canadian PPL"`).
   * `null` when the file uses the legacy bare-array format.
   */
  subject: string | null;
  /** All cards from the batch. */
  cards: ParsedCard[];
};

/**
 * A single flashcard as parsed from a JSON question file, ready for
 * validation and database import.
 *
 * Both the JSON parser and the Markdown migration script produce this type,
 * so the validator and import service are format-agnostic.
 */
export type ParsedCard = {
  /**
   * Identifier from the source file (e.g. `"MET-126"`, `"Q001"`).
   * Stored as `Card.originalId` in the database and used as the upsert key
   * so re-imports are idempotent.
   */
  sourceId: string;
  /** Subject area label, e.g. `"Meteorology - Canadian Weather Products"`. */
  topic: string | null;
  /**
   * Card type. Maps to the `CardType` Prisma enum.
   * `"MULTIPLE_CHOICE"` cards have entries in `choices`;
   * `"OPEN_ANSWER"` cards have an empty `choices` array.
   */
  cardType: "MULTIPLE_CHOICE" | "OPEN_ANSWER";
  /**
   * Authored difficulty label. Maps to the `CardDifficulty` Prisma enum.
   * `null` for migrated cards where difficulty was not recorded.
   */
  difficulty: "EASY" | "MEDIUM" | "HARD" | null;
  /** Filterable tags in lowercase kebab-case (e.g. `["nav-canada", "metar"]`). */
  tags: string[];
  /** Full question text, plain prose with no Markdown formatting. */
  questionText: string;
  /**
   * Answer choices. Empty array for `"OPEN_ANSWER"` cards.
   * For `"MULTIPLE_CHOICE"` cards, at least one choice has `isCorrect: true`.
   */
  choices: ParsedChoice[];
  /**
   * For multiple-choice cards: text of the correct answer(s), used for
   * quick display and export. For open-answer cards: the full model answer.
   */
  answerText: string;
  /**
   * Explanation of why the answer is correct. May include rule numbers,
   * regulation citations, or underlying principles.
   */
  explanation: string | null;
  /**
   * Authoritative source citation (document name, section, regulation).
   * `null` only for migrated cards where no reference was recorded.
   */
  reference: string | null;
  /**
   * Media assets attached to this card. Empty array if no media.
   * Assets are not downloaded at import time — see `ParsedMedia.src`.
   */
  media: ParsedMedia[];
};
