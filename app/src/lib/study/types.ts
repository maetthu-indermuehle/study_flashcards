/**
 * @module study/types
 * Domain types for the study flow.
 *
 * These are plain TypeScript types — no Prisma imports — so they can be
 * shared freely between the data access layer, Server Components, and
 * Client Components without creating server-only boundary issues.
 */

/** A single choice on a multiple-choice card. */
export type StudyCardChoice = {
  id: string;
  text: string;
  isCorrect: boolean;
};

/** A source reference citation shown after a card is answered. */
export type StudyCardReference = {
  label: string;
  url: string | null;
};

/** A multiple-choice card with its choices pre-shuffled. */
export type MultipleChoiceCard = {
  id: string;
  type: "MULTIPLE_CHOICE";
  question: string;
  /** Canonical correct answer text (shown in feedback). */
  answer: string;
  explanation: string | null;
  /** Shuffled at query time — never in stored order. */
  choices: StudyCardChoice[];
  reference: StudyCardReference | null;
  /** Original source ID from the import file (e.g. "MET-042"). */
  originalId: string | null;
  /** True if the card has been flagged for later review. */
  flagged: boolean;
  /** Note left when the card was flagged, if any. */
  flagNote: string | null;
  /** TOPIC tag names for this card (used in the ID tooltip). */
  topics: string[];
  /** Non-system custom tag names (excludes "flagged"). */
  tags: string[];
};

/** An open-answer card where the user self-assesses after revealing. */
export type OpenAnswerCard = {
  id: string;
  type: "OPEN_ANSWER";
  question: string;
  answer: string;
  explanation: string | null;
  reference: StudyCardReference | null;
  /** Original source ID from the import file (e.g. "MET-042"). */
  originalId: string | null;
  /** True if the card has been flagged for later review. */
  flagged: boolean;
  /** Note left when the card was flagged, if any. */
  flagNote: string | null;
  /** TOPIC tag names for this card (used in the ID tooltip). */
  topics: string[];
  /** Non-system custom tag names (excludes "flagged"). */
  tags: string[];
};

/**
 * A card ready to be displayed in the study flow.
 * Discriminated on `type` — narrow with `card.type === "MULTIPLE_CHOICE"`.
 */
export type StudyCard = MultipleChoiceCard | OpenAnswerCard;
