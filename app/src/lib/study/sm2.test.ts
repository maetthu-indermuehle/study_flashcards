import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeNextProgress } from "./sm2";
import { ReviewRating } from "../../generated/prisma/enums";

const NOW = new Date("2026-01-01T12:00:00Z");

const BASE = {
  intervalDays: 6,
  ease: 2.5,
  lapses: 0,
  reviewCount: 2,
};

describe("computeNextProgress", () => {
  // -------------------------------------------------------------------------
  // WRONG — relearning step
  // -------------------------------------------------------------------------

  it("WRONG on first review: due in 10 minutes, intervalDays=1, lapses=1", () => {
    const result = computeNextProgress(null, ReviewRating.WRONG, NOW);
    const expectedDue = new Date(NOW.getTime() + 10 * 60 * 1000);
    assert.equal(result.dueAt.getTime(), expectedDue.getTime());
    assert.equal(result.intervalDays, 1);
    assert.equal(result.lapses, 1);
    assert.equal(result.reviewCount, 1);
    assert.equal(result.lastRating, ReviewRating.WRONG);
  });

  it("WRONG on established card: due in 10 minutes, resets intervalDays to 1", () => {
    const result = computeNextProgress(BASE, ReviewRating.WRONG, NOW);
    const expectedDue = new Date(NOW.getTime() + 10 * 60 * 1000);
    assert.equal(result.dueAt.getTime(), expectedDue.getTime());
    assert.equal(result.intervalDays, 1);
    assert.equal(result.lapses, BASE.lapses + 1);
  });

  it("WRONG reduces ease by 0.8", () => {
    const result = computeNextProgress(BASE, ReviewRating.WRONG, NOW);
    assert.ok(Math.abs(result.ease - (2.5 - 0.8)) < 0.001);
  });

  it("WRONG does not push ease below 1.3", () => {
    const lowEase = { ...BASE, ease: 1.4 };
    const result = computeNextProgress(lowEase, ReviewRating.WRONG, NOW);
    assert.equal(result.ease, 1.3);
  });

  // -------------------------------------------------------------------------
  // HARD — reset to 1 day
  // -------------------------------------------------------------------------

  it("HARD: due in 1 day, intervalDays=1, lapses incremented", () => {
    const result = computeNextProgress(BASE, ReviewRating.HARD, NOW);
    const expectedDue = new Date(NOW.getTime() + 1 * 24 * 60 * 60 * 1000);
    assert.equal(result.dueAt.getTime(), expectedDue.getTime());
    assert.equal(result.intervalDays, 1);
    assert.equal(result.lapses, BASE.lapses + 1);
    assert.equal(result.lastRating, ReviewRating.HARD);
  });

  it("HARD reduces ease by ~0.14", () => {
    const result = computeNextProgress(BASE, ReviewRating.HARD, NOW);
    assert.ok(Math.abs(result.ease - (2.5 - 0.14)) < 0.001);
  });

  it("HARD does not push ease below 1.3", () => {
    const lowEase = { ...BASE, ease: 1.35 };
    const result = computeNextProgress(lowEase, ReviewRating.HARD, NOW);
    assert.equal(result.ease, 1.3);
  });

  // -------------------------------------------------------------------------
  // GOOD — SM-2 advancement
  // -------------------------------------------------------------------------

  it("GOOD on first review (reviewCount=0): interval=1 day", () => {
    const result = computeNextProgress(null, ReviewRating.GOOD, NOW);
    assert.equal(result.intervalDays, 1);
    assert.equal(result.lapses, 0);
    assert.equal(result.lastRating, ReviewRating.GOOD);
  });

  it("GOOD on second review (reviewCount=1): interval=6 days", () => {
    const second = { ...BASE, reviewCount: 1, intervalDays: 1 };
    const result = computeNextProgress(second, ReviewRating.GOOD, NOW);
    assert.equal(result.intervalDays, 6);
  });

  it("GOOD on subsequent review: interval = round(prev * ease)", () => {
    const result = computeNextProgress(BASE, ReviewRating.GOOD, NOW);
    const expected = Math.round(BASE.intervalDays * BASE.ease);
    assert.equal(result.intervalDays, expected);
  });

  it("GOOD does not change lapses", () => {
    const result = computeNextProgress(BASE, ReviewRating.GOOD, NOW);
    assert.equal(result.lapses, BASE.lapses);
  });

  it("GOOD ease stays the same (q=4 → Δease≈0)", () => {
    const result = computeNextProgress(BASE, ReviewRating.GOOD, NOW);
    // q=4: ease + 0.1 - 1*(0.08 + 1*0.02) = ease + 0.1 - 0.10 = ease
    assert.ok(Math.abs(result.ease - BASE.ease) < 0.001);
  });

  // -------------------------------------------------------------------------
  // EASY — SM-2 with ease bonus
  // -------------------------------------------------------------------------

  it("EASY on first review: interval=1 day, ease increases", () => {
    const result = computeNextProgress(null, ReviewRating.EASY, NOW);
    assert.equal(result.intervalDays, 1);
    assert.ok(result.ease > 2.5);
  });

  it("EASY increases ease by 0.1", () => {
    const result = computeNextProgress(BASE, ReviewRating.EASY, NOW);
    assert.ok(Math.abs(result.ease - (BASE.ease + 0.1)) < 0.001);
  });

  it("EASY does not change lapses", () => {
    const result = computeNextProgress(BASE, ReviewRating.EASY, NOW);
    assert.equal(result.lapses, BASE.lapses);
  });

  // -------------------------------------------------------------------------
  // reviewCount always increments
  // -------------------------------------------------------------------------

  it("reviewCount increments regardless of rating", () => {
    for (const rating of Object.values(ReviewRating)) {
      const result = computeNextProgress(BASE, rating, NOW);
      assert.equal(result.reviewCount, BASE.reviewCount + 1);
    }
  });

  // -------------------------------------------------------------------------
  // null current (new card defaults)
  // -------------------------------------------------------------------------

  it("null current uses default ease of 2.5", () => {
    const result = computeNextProgress(null, ReviewRating.EASY, NOW);
    assert.ok(result.ease > 2.5); // ease starts at 2.5 and increases for EASY
  });
});
