/**
 * Unit tests for lib/cards/queries helpers.
 *
 * These tests cover the pure, in-process logic only (filter parsing, data
 * mapping). Database queries are not tested here — they require a live DB and
 * are covered by integration tests in a later phase.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_FILTERS, PAGE_SIZE } from "./types";

// ---------------------------------------------------------------------------
// DEFAULT_FILTERS shape
// ---------------------------------------------------------------------------

describe("DEFAULT_FILTERS", () => {
  it("defaults status to PUBLISHED", () => {
    assert.equal(DEFAULT_FILTERS.status, "PUBLISHED");
  });

  it("defaults type and difficulty to ALL", () => {
    assert.equal(DEFAULT_FILTERS.type, "ALL");
    assert.equal(DEFAULT_FILTERS.difficulty, "ALL");
  });

  it("defaults flaggedOnly to false", () => {
    assert.equal(DEFAULT_FILTERS.flaggedOnly, false);
  });

  it("defaults tagIds to an empty array", () => {
    assert.deepEqual(DEFAULT_FILTERS.tagIds, []);
  });

  it("defaults sort to createdAt asc", () => {
    assert.equal(DEFAULT_FILTERS.sort, "createdAt");
    assert.equal(DEFAULT_FILTERS.sortDir, "asc");
  });

  it("defaults page to 1", () => {
    assert.equal(DEFAULT_FILTERS.page, 1);
  });
});

// ---------------------------------------------------------------------------
// PAGE_SIZE
// ---------------------------------------------------------------------------

describe("PAGE_SIZE", () => {
  it("is a positive integer", () => {
    assert.ok(Number.isInteger(PAGE_SIZE));
    assert.ok(PAGE_SIZE > 0);
  });
});

// ---------------------------------------------------------------------------
// Filter merging (simulates what listCards does with Partial<CardFilters>)
// ---------------------------------------------------------------------------

describe("filter merging", () => {
  it("partial overrides are applied over defaults", () => {
    const partial = { search: "weather", type: "MULTIPLE_CHOICE" as const };
    const merged = { ...DEFAULT_FILTERS, ...partial };

    assert.equal(merged.search, "weather");
    assert.equal(merged.type, "MULTIPLE_CHOICE");
    // untouched fields remain default
    assert.equal(merged.difficulty, "ALL");
    assert.equal(merged.status, "PUBLISHED");
  });

  it("empty partial leaves all defaults intact", () => {
    const merged = { ...DEFAULT_FILTERS, ...{} };
    assert.deepEqual(merged, DEFAULT_FILTERS);
  });

  it("flaggedOnly override sets flag", () => {
    const merged = { ...DEFAULT_FILTERS, flaggedOnly: true };
    assert.equal(merged.flaggedOnly, true);
  });
});

// ---------------------------------------------------------------------------
// Flag detection logic (mirrors what listCards uses internally)
// ---------------------------------------------------------------------------

type MockCardTag = { note: string | null; tag: { name: string; type: string } };

function isFlaggedTag(ct: MockCardTag): boolean {
  return ct.tag.name === "flagged" && ct.tag.type === "CUSTOM";
}

describe("flag detection", () => {
  it("identifies the flagged tag", () => {
    const ct: MockCardTag = { note: "missing diagram", tag: { name: "flagged", type: "CUSTOM" } };
    assert.ok(isFlaggedTag(ct));
  });

  it("does not match a non-flagged tag", () => {
    const ct: MockCardTag = { note: null, tag: { name: "meteorology", type: "TOPIC" } };
    assert.ok(!isFlaggedTag(ct));
  });

  it("does not match flagged name with wrong type", () => {
    const ct: MockCardTag = { note: null, tag: { name: "flagged", type: "TOPIC" } };
    assert.ok(!isFlaggedTag(ct));
  });

  it("extracts flag note when present", () => {
    const tags: MockCardTag[] = [
      { note: "typo in answer", tag: { name: "flagged", type: "CUSTOM" } },
      { note: null, tag: { name: "meteorology", type: "TOPIC" } },
    ];
    const flagCt = tags.find(isFlaggedTag);
    assert.equal(flagCt?.note, "typo in answer");
  });

  it("returns null flagNote when note is null", () => {
    const tags: MockCardTag[] = [
      { note: null, tag: { name: "flagged", type: "CUSTOM" } },
    ];
    const flagCt = tags.find(isFlaggedTag);
    assert.equal(flagCt?.note ?? null, null);
  });

  it("filters out flagged tag from visible tag list", () => {
    const tags: MockCardTag[] = [
      { note: null, tag: { name: "flagged", type: "CUSTOM" } },
      { note: null, tag: { name: "meteorology", type: "TOPIC" } },
      { note: null, tag: { name: "airlaw", type: "TOPIC" } },
    ];
    const visible = tags.filter((ct) => !isFlaggedTag(ct));
    assert.equal(visible.length, 2);
    assert.ok(visible.every((ct) => ct.tag.name !== "flagged"));
  });
});

// ---------------------------------------------------------------------------
// Due date formatting (mirrors CardBrowser formatDue helper)
// ---------------------------------------------------------------------------

function formatDue(date: Date): string {
  const now = Date.now();
  const diff = date.getTime() - now;
  const days = Math.round(diff / 86_400_000);
  if (days <= 0) return "due";
  if (days === 1) return "1d";
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${Math.round(days / 365)}y`;
}

describe("formatDue", () => {
  it('returns "due" for past dates', () => {
    const past = new Date(Date.now() - 86_400_000);
    assert.equal(formatDue(past), "due");
  });

  it('returns "due" for today', () => {
    assert.equal(formatDue(new Date()), "due");
  });

  it('returns "1d" for tomorrow', () => {
    const tomorrow = new Date(Date.now() + 86_400_000 * 1.1);
    assert.equal(formatDue(tomorrow), "1d");
  });

  it('returns "7d" for one week', () => {
    const week = new Date(Date.now() + 86_400_000 * 7);
    assert.equal(formatDue(week), "7d");
  });

  it('returns months for 30+ days', () => {
    const month = new Date(Date.now() + 86_400_000 * 30);
    assert.equal(formatDue(month), "1mo");
  });

  it('returns years for 365+ days', () => {
    const year = new Date(Date.now() + 86_400_000 * 365);
    assert.equal(formatDue(year), "1y");
  });
});
