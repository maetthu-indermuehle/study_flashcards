import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validate } from "./validator";
import type { ParsedCard } from "./types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeCard(overrides: Partial<ParsedCard> = {}): ParsedCard {
  return {
    sourceId: "MET-001",
    topic: "Meteorology",
    cardType: "MULTIPLE_CHOICE",
    difficulty: "EASY",
    tags: ["weather"],
    questionText: "What is a METAR?",
    choices: [
      { text: "A weather observation report", isCorrect: true },
      { text: "A weather forecast", isCorrect: false },
    ],
    answerText: "A weather observation report",
    explanation: "METARs are routine surface observations.",
    reference: "NAV CANADA Aviation Weather Services Guide",
    media: [],
    ...overrides,
  };
}

function makeOpenCard(overrides: Partial<ParsedCard> = {}): ParsedCard {
  return {
    sourceId: "MET-002",
    topic: "Meteorology",
    cardType: "OPEN_ANSWER",
    difficulty: "MEDIUM",
    tags: ["weather"],
    questionText: "Explain the difference between a METAR and a TAF.",
    choices: [],
    answerText: "A METAR reports current conditions; a TAF forecasts future conditions.",
    explanation: null,
    reference: "NAV CANADA Aviation Weather Services Guide",
    media: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("validate", () => {
  describe("valid input", () => {
    it("returns no errors for a valid MC card", () => {
      assert.deepEqual(validate([makeCard()]), []);
    });

    it("returns no errors for a valid open-answer card", () => {
      assert.deepEqual(validate([makeOpenCard()]), []);
    });

    it("returns no errors for an empty batch", () => {
      assert.deepEqual(validate([]), []);
    });

    it("returns no errors for a mixed valid batch", () => {
      assert.deepEqual(validate([makeCard(), makeOpenCard()]), []);
    });
  });

  describe("EMPTY_QUESTION", () => {
    it("reports an error when questionText is an empty string", () => {
      const errors = validate([makeCard({ questionText: "" })]);
      assert.equal(errors.length, 1);
      assert.equal(errors[0].code, "EMPTY_QUESTION");
      assert.equal(errors[0].severity, "error");
      assert.equal(errors[0].sourceId, "MET-001");
    });

    it("reports an error when questionText is only whitespace", () => {
      const errors = validate([makeCard({ questionText: "   " })]);
      assert.equal(errors.length, 1);
      assert.equal(errors[0].code, "EMPTY_QUESTION");
    });
  });

  describe("MISSING_ANSWER", () => {
    it("reports an error when answerText is empty", () => {
      const errors = validate([makeCard({ answerText: "" })]);
      assert.equal(errors.length, 1);
      assert.equal(errors[0].code, "MISSING_ANSWER");
      assert.equal(errors[0].severity, "error");
    });

    it("reports an error when answerText is only whitespace", () => {
      const errors = validate([makeCard({ answerText: "  " })]);
      assert.equal(errors.length, 1);
      assert.equal(errors[0].code, "MISSING_ANSWER");
    });
  });

  describe("NO_CORRECT_CHOICE", () => {
    it("reports an error for an MC card with no correct choice", () => {
      const errors = validate([
        makeCard({
          choices: [
            { text: "Option A", isCorrect: false },
            { text: "Option B", isCorrect: false },
          ],
        }),
      ]);
      assert.equal(errors.length, 1);
      assert.equal(errors[0].code, "NO_CORRECT_CHOICE");
      assert.equal(errors[0].severity, "error");
    });

    it("reports an error for an MC card with an empty choices array", () => {
      const errors = validate([makeCard({ choices: [] })]);
      assert.equal(errors.length, 1);
      assert.equal(errors[0].code, "NO_CORRECT_CHOICE");
    });

    it("does not report NO_CORRECT_CHOICE for an open-answer card", () => {
      const errors = validate([makeOpenCard({ choices: [] })]);
      assert.equal(errors.length, 0);
    });

    it("does not report an error when multiple choices are correct", () => {
      const errors = validate([
        makeCard({
          choices: [
            { text: "METAR", isCorrect: true },
            { text: "SPECI", isCorrect: true },
            { text: "TAF", isCorrect: false },
          ],
        }),
      ]);
      assert.equal(errors.length, 0);
    });
  });

  describe("MISSING_REFERENCE", () => {
    it("reports a warning when reference is null", () => {
      const errors = validate([makeCard({ reference: null })]);
      assert.equal(errors.length, 1);
      assert.equal(errors[0].code, "MISSING_REFERENCE");
      assert.equal(errors[0].severity, "warning");
    });

    it("reports a warning when reference is an empty string", () => {
      // The parser rejects empty strings, but the validator guards against it
      // in case cards are constructed programmatically.
      const errors = validate([makeCard({ reference: "" })]);
      assert.equal(errors.length, 1);
      assert.equal(errors[0].code, "MISSING_REFERENCE");
    });
  });

  describe("DUPLICATE_SOURCE_ID", () => {
    it("reports an error when two cards share a sourceId", () => {
      const errors = validate([
        makeCard({ sourceId: "MET-001" }),
        makeOpenCard({ sourceId: "MET-001" }),
      ]);
      assert.equal(errors.length, 1);
      assert.equal(errors[0].code, "DUPLICATE_SOURCE_ID");
      assert.equal(errors[0].severity, "error");
      assert.equal(errors[0].sourceId, "MET-001");
    });

    it("reports one error per extra duplicate, not one per pair", () => {
      const errors = validate([
        makeCard({ sourceId: "X-1" }),
        makeCard({ sourceId: "X-1" }),
        makeCard({ sourceId: "X-1" }),
      ]);
      const dupes = errors.filter((e) => e.code === "DUPLICATE_SOURCE_ID");
      assert.equal(dupes.length, 2);
    });

    it("does not report an error for unique sourceIds", () => {
      const errors = validate([
        makeCard({ sourceId: "MET-001" }),
        makeOpenCard({ sourceId: "MET-002" }),
      ]);
      assert.equal(errors.length, 0);
    });
  });

  describe("multiple errors on one card", () => {
    it("reports all applicable errors for a single bad card", () => {
      const errors = validate([
        makeCard({
          questionText: "",
          answerText: "",
          choices: [],
          reference: null,
        }),
      ]);
      const codes = errors.map((e) => e.code);
      assert.ok(codes.includes("EMPTY_QUESTION"));
      assert.ok(codes.includes("MISSING_ANSWER"));
      assert.ok(codes.includes("NO_CORRECT_CHOICE"));
      assert.ok(codes.includes("MISSING_REFERENCE"));
      assert.equal(errors.length, 4);
    });
  });

  describe("sourceId on all errors", () => {
    it("attaches the correct sourceId to every error", () => {
      const errors = validate([
        makeCard({ sourceId: "AIRLAW-042", questionText: "", reference: null }),
      ]);
      assert.ok(errors.every((e) => e.sourceId === "AIRLAW-042"));
    });
  });
});
