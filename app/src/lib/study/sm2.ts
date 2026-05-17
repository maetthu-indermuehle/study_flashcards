/**
 * @module study/sm2
 * SM-2 spaced repetition scheduler.
 *
 * Computes the next review state for a (user, card) pair given a rating.
 * Pure function — no database access. Designed to be unit-tested in isolation
 * and called from the review API route.
 *
 * Algorithm:
 *   Rating → SM-2 quality score: WRONG=0, HARD=2, GOOD=4, EASY=5.
 *
 *   Ease factor update (applied on GOOD and EASY only):
 *     ease' = max(1.3, ease + 0.1 − (5−q) × (0.08 + (5−q) × 0.02))
 *
 *   Interval:
 *     WRONG  → dueAt = now + 10 minutes (relearning step), reset intervalDays=1
 *     HARD   → dueAt = now + 1 day, reset intervalDays=1
 *     GOOD   → 1st review: 1 day; 2nd: 6 days; subsequent: round(prev × ease)
 *     EASY   → same as GOOD but with ease bonus applied first
 *
 * The WRONG 10-minute relearning window means the card resurfaces within the
 * current study session rather than being deferred until tomorrow.
 *
 * FSRS can replace this in a later phase by swapping this module; the
 * CardProgress schema already has `stability` and `difficulty` columns for it.
 */

import { ReviewRating } from "../../generated/prisma/enums";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * The subset of CardProgress fields needed by the scheduler.
 * Pass `null` when no CardProgress row exists yet (first review of a card).
 */
export type ProgressSnapshot = {
  intervalDays: number;
  ease: number;
  lapses: number;
  reviewCount: number;
};

/**
 * Fields to write back to CardProgress after applying the algorithm.
 */
export type ProgressUpdate = {
  dueAt: Date;
  intervalDays: number;
  ease: number;
  lapses: number;
  reviewCount: number;
  lastRating: ReviewRating;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_EASE = 1.3;
const RELEARN_MINUTES = 10;

/** SM-2 quality score for each ReviewRating. */
const QUALITY: Record<ReviewRating, number> = {
  [ReviewRating.WRONG]: 0,
  [ReviewRating.HARD]: 2,
  [ReviewRating.GOOD]: 4,
  [ReviewRating.EASY]: 5,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Computes the next CardProgress state after a review.
 *
 * @param current - Existing progress snapshot, or `null` for a first review.
 * @param rating  - The user's self-reported difficulty rating.
 * @param now     - Reference time for scheduling (defaults to `new Date()`).
 *                  Injectable for deterministic unit testing.
 * @returns The fields to upsert into CardProgress.
 *
 * @example
 * ```ts
 * const update = computeNextProgress(null, ReviewRating.GOOD);
 * await prisma.cardProgress.upsert({ ... data: update });
 * ```
 */
export function computeNextProgress(
  current: ProgressSnapshot | null,
  rating: ReviewRating,
  now: Date = new Date(),
): ProgressUpdate {
  const prev: ProgressSnapshot = current ?? {
    intervalDays: 1,
    ease: 2.5,
    lapses: 0,
    reviewCount: 0,
  };

  const reviewCount = prev.reviewCount + 1;
  const q = QUALITY[rating];

  // -------------------------------------------------------------------------
  // WRONG — relearning step: resurface in 10 minutes, reset interval to 1 day
  // -------------------------------------------------------------------------
  if (rating === ReviewRating.WRONG) {
    const dueAt = new Date(now.getTime() + RELEARN_MINUTES * 60 * 1000);
    return {
      dueAt,
      intervalDays: 1,
      ease: Math.max(MIN_EASE, prev.ease - 0.8),
      lapses: prev.lapses + 1,
      reviewCount,
      lastRating: rating,
    };
  }

  // -------------------------------------------------------------------------
  // HARD — reset interval to 1 day (card still needs work)
  // -------------------------------------------------------------------------
  if (rating === ReviewRating.HARD) {
    const dueAt = addDays(now, 1);
    return {
      dueAt,
      intervalDays: 1,
      ease: Math.max(MIN_EASE, prev.ease - 0.14),
      lapses: prev.lapses + 1,
      reviewCount,
      lastRating: rating,
    };
  }

  // -------------------------------------------------------------------------
  // GOOD / EASY — advance the interval using SM-2
  // -------------------------------------------------------------------------
  const newEase = Math.max(MIN_EASE, prev.ease + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));

  let intervalDays: number;
  if (prev.reviewCount === 0) {
    intervalDays = 1;
  } else if (prev.reviewCount === 1) {
    intervalDays = 6;
  } else {
    intervalDays = Math.round(prev.intervalDays * newEase);
  }

  return {
    dueAt: addDays(now, intervalDays),
    intervalDays,
    ease: newEase,
    lapses: prev.lapses,
    reviewCount,
    lastRating: rating,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}
