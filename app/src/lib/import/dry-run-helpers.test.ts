import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { partitionCounts, buildSample } from "./dry-run-helpers";
import type { ParsedCard } from "@/lib/importer/types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeCard(overrides: Partial<ParsedCard> = {}): ParsedCard {
  return {
    sourceId: "Q001",
    topic: "Navigation",
    cardType: "MULTIPLE_CHOICE",
    difficulty: "MEDIUM",
    tags: [],
    questionText: "What does VFR stand for?",
    choices: [
      { text: "Visual Flight Rules", isCorrect: true },
      { text: "Variable Frequency Radio", isCorrect: false },
    ],
    answerText: "Visual Flight Rules",
    explanation: null,
    reference: null,
    media: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// partitionCounts
// ---------------------------------------------------------------------------

describe("partitionCounts", () => {
  it("all new cards when existingIds is empty", () => {
    const cards = [makeCard({ sourceId: "Q001" }), makeCard({ sourceId: "Q002" })];
    const result = partitionCounts(cards, new Set());
    assert.equal(result.toCreate, 2);
    assert.equal(result.toUpdate, 0);
  });

  it("all updates when every card exists", () => {
    const cards = [makeCard({ sourceId: "Q001" }), makeCard({ sourceId: "Q002" })];
    const result = partitionCounts(cards, new Set(["Q001", "Q002"]));
    assert.equal(result.toCreate, 0);
    assert.equal(result.toUpdate, 2);
  });

  it("splits correctly with mixed new and existing", () => {
    const cards = [
      makeCard({ sourceId: "Q001" }),
      makeCard({ sourceId: "Q002" }),
      makeCard({ sourceId: "Q003" }),
    ];
    const result = partitionCounts(cards, new Set(["Q001", "Q003"]));
    assert.equal(result.toCreate, 1);
    assert.equal(result.toUpdate, 2);
  });

  it("counts add up to total", () => {
    const cards = Array.from({ length: 10 }, (_, i) =>
      makeCard({ sourceId: `Q${String(i).padStart(3, "0")}` }),
    );
    const existing = new Set(["Q000", "Q001", "Q002"]);
    const result = partitionCounts(cards, existing);
    assert.equal(result.toCreate + result.toUpdate, cards.length);
  });

  it("returns zero counts for empty card list", () => {
    const result = partitionCounts([], new Set(["Q001"]));
    assert.equal(result.toCreate, 0);
    assert.equal(result.toUpdate, 0);
  });
});

// ---------------------------------------------------------------------------
// buildSample
// ---------------------------------------------------------------------------

describe("buildSample", () => {
  it("returns at most 10 cards", () => {
    const cards = Array.from({ length: 15 }, (_, i) =>
      makeCard({ sourceId: `Q${String(i).padStart(3, "0")}` }),
    );
    const sample = buildSample(cards, new Set());
    assert.equal(sample.length, 10);
  });

  it("returns all cards when fewer than 10", () => {
    const cards = [makeCard({ sourceId: "Q001" }), makeCard({ sourceId: "Q002" })];
    const sample = buildSample(cards, new Set());
    assert.equal(sample.length, 2);
  });

  it("marks existing cards as isNew=false", () => {
    const cards = [makeCard({ sourceId: "Q001" }), makeCard({ sourceId: "Q002" })];
    const sample = buildSample(cards, new Set(["Q001"]));
    assert.equal(sample[0].isNew, false);
    assert.equal(sample[1].isNew, true);
  });

  it("truncates question text longer than 80 chars", () => {
    const longQuestion = "A".repeat(100);
    const cards = [makeCard({ sourceId: "Q001", questionText: longQuestion })];
    const sample = buildSample(cards, new Set());
    // 80 chars + ellipsis character = 81 chars visible
    assert.ok(sample[0].question.endsWith("…"));
    assert.ok(sample[0].question.length <= 82); // 80 + "…" (multi-byte)
  });

  it("does not truncate question text at or under 80 chars", () => {
    const exactQuestion = "A".repeat(80);
    const cards = [makeCard({ sourceId: "Q001", questionText: exactQuestion })];
    const sample = buildSample(cards, new Set());
    assert.equal(sample[0].question, exactQuestion);
    assert.ok(!sample[0].question.endsWith("…"));
  });

  it("includes sourceId in each sample entry", () => {
    const cards = [makeCard({ sourceId: "NAV-042" })];
    const sample = buildSample(cards, new Set());
    assert.equal(sample[0].sourceId, "NAV-042");
  });
});
