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
};

/** An open-answer card where the user self-assesses after revealing. */
export type OpenAnswerCard = {
  id: string;
  type: "OPEN_ANSWER";
  question: string;
  answer: string;
  explanation: string | null;
  reference: StudyCardReference | null;
};

/**
 * A card ready to be displayed in the study flow.
 * Discriminated on `type` — narrow with `card.type === "MULTIPLE_CHOICE"`.
 */
export type StudyCard = MultipleChoiceCard | OpenAnswerCard;
