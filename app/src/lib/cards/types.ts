/**
 * @module lib/cards/types
 * Plain TypeScript types for the card management feature.
 * No Prisma imports — safe to use in Server and Client Components.
 */

import type {
  CardType,
  CardDifficulty,
  CardStatus,
  TagType,
} from "@/generated/prisma/enums";

export type { CardType, CardDifficulty, CardStatus, TagType };

// ---------------------------------------------------------------------------
// Card list (browser)
// ---------------------------------------------------------------------------

export type CardListItem = {
  id: string;
  originalId: string | null;
  type: CardType;
  /** Full question text — truncated in the UI. */
  question: string;
  difficulty: CardDifficulty;
  status: CardStatus;
  flagged: boolean;
  flagNote: string | null;
  /** Non-flagged tags only. */
  tags: { id: string; name: string; type: TagType }[];
  /** null if the user has never reviewed this card. */
  dueAt: Date | null;
  reviewCount: number;
  createdAt: Date;
};

// ---------------------------------------------------------------------------
// Card detail (edit page)
// ---------------------------------------------------------------------------

export type CardDetailChoice = {
  id: string;
  text: string;
  isCorrect: boolean;
  sortOrder: number;
};

export type CardDetailTag = {
  id: string;
  name: string;
  type: TagType;
};

export type CardDetailReference = {
  id: string;
  label: string;
  url: string | null;
  documentName: string | null;
  page: number | null;
  section: string | null;
  notes: string | null;
};

export type CardDetail = {
  id: string;
  originalId: string | null;
  type: CardType;
  question: string;
  answer: string;
  explanation: string | null;
  difficulty: CardDifficulty;
  status: CardStatus;
  deckId: string;
  createdAt: Date;
  updatedAt: Date;
  choices: CardDetailChoice[];
  tags: CardDetailTag[];
  references: CardDetailReference[];
  flagged: boolean;
  flagNote: string | null;
};

// ---------------------------------------------------------------------------
// Tag option (for selectors)
// ---------------------------------------------------------------------------

export type TagOption = {
  id: string;
  name: string;
  type: TagType;
};

// ---------------------------------------------------------------------------
// Filters (driven by URL search params)
// ---------------------------------------------------------------------------

export type CardFilters = {
  search: string;
  type: CardType | "ALL";
  difficulty: CardDifficulty | "ALL";
  status: CardStatus | "ALL";
  tagIds: string[];
  flaggedOnly: boolean;
  sort: "question" | "createdAt";
  sortDir: "asc" | "desc";
  page: number;
};

export const DEFAULT_FILTERS: CardFilters = {
  search: "",
  type: "ALL",
  difficulty: "ALL",
  status: "PUBLISHED",
  tagIds: [],
  flaggedOnly: false,
  sort: "createdAt",
  sortDir: "asc",
  page: 1,
};

export const PAGE_SIZE = 50;

// ---------------------------------------------------------------------------
// Form data (create / update)
// ---------------------------------------------------------------------------

export type CardFormChoice = {
  /** Undefined for newly added choices not yet in the DB. */
  id?: string;
  text: string;
  isCorrect: boolean;
  sortOrder: number;
};

export type CardFormReference = {
  id?: string;
  label: string;
  url: string;
  documentName: string;
  page: string;
  section: string;
  notes: string;
};

export type CardFormData = {
  question: string;
  answer: string;
  explanation: string;
  type: CardType;
  difficulty: CardDifficulty;
  status: CardStatus;
  choices: CardFormChoice[];
  /** IDs of existing tags to assign to the card. */
  tagIds: string[];
  /** New tags to create and assign (upserted by name+type). */
  newTags: { name: string; type: TagType }[];
  /** First (canonical) source reference. Null means no change to existing references. */
  reference: CardFormReference | null;
};
