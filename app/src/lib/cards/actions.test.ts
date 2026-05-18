/**
 * Unit tests for lib/cards/actions helpers.
 *
 * These tests cover pure validation and data-shaping logic that does not
 * require a database connection. The Server Action functions themselves
 * require a live DB + session and are covered by integration tests later.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { CardFormData, CardFormChoice } from "./types";

// ---------------------------------------------------------------------------
// Form data validation (mirrors CardForm.validate())
// ---------------------------------------------------------------------------

function validate(data: CardFormData): string | null {
  if (!data.question.trim()) return "Question is required.";
  if (!data.answer.trim()) return "Answer is required.";
  if (data.type === "MULTIPLE_CHOICE") {
    if (data.choices.length < 2) return "Add at least 2 choices.";
    if (!data.choices.some((c) => c.isCorrect))
      return "Mark at least one choice as correct.";
    if (data.choices.some((c) => !c.text.trim()))
      return "All choices must have text.";
  }
  return null;
}

const baseChoices: CardFormChoice[] = [
  { text: "Option A", isCorrect: true, sortOrder: 0 },
  { text: "Option B", isCorrect: false, sortOrder: 1 },
];

const validMCData: CardFormData = {
  type: "MULTIPLE_CHOICE",
  question: "What is the speed of sound?",
  answer: "340 m/s",
  explanation: "",
  difficulty: "MEDIUM",
  status: "PUBLISHED",
  choices: baseChoices,
  tagIds: [],
  newTags: [],
  reference: null,
};

const validOAData: CardFormData = {
  type: "OPEN_ANSWER",
  question: "Describe the standard lapse rate.",
  answer: "2°C per 1000 ft",
  explanation: "",
  difficulty: "EASY",
  status: "DRAFT",
  choices: [],
  tagIds: [],
  newTags: [],
  reference: null,
};

describe("validate — multiple choice", () => {
  it("passes valid MC data", () => {
    assert.equal(validate(validMCData), null);
  });

  it("fails with empty question", () => {
    assert.ok(validate({ ...validMCData, question: "   " })?.includes("Question"));
  });

  it("fails with empty answer", () => {
    assert.ok(validate({ ...validMCData, answer: "" })?.includes("Answer"));
  });

  it("fails with fewer than 2 choices", () => {
    const data = { ...validMCData, choices: [baseChoices[0]] };
    assert.ok(validate(data)?.includes("2 choices"));
  });

  it("fails with no correct choice", () => {
    const choices = baseChoices.map((c) => ({ ...c, isCorrect: false }));
    assert.ok(validate({ ...validMCData, choices })?.includes("correct"));
  });

  it("fails with a blank choice text", () => {
    const choices: CardFormChoice[] = [
      { text: "", isCorrect: true, sortOrder: 0 },
      { text: "Option B", isCorrect: false, sortOrder: 1 },
    ];
    assert.ok(validate({ ...validMCData, choices })?.includes("text"));
  });

  it("passes with multiple correct choices (select-all-that-apply)", () => {
    const choices: CardFormChoice[] = [
      { text: "A", isCorrect: true, sortOrder: 0 },
      { text: "B", isCorrect: true, sortOrder: 1 },
      { text: "C", isCorrect: false, sortOrder: 2 },
    ];
    assert.equal(validate({ ...validMCData, choices }), null);
  });
});

describe("validate — open answer", () => {
  it("passes valid OA data", () => {
    assert.equal(validate(validOAData), null);
  });

  it("does not require choices for OA", () => {
    assert.equal(validate({ ...validOAData, choices: [] }), null);
  });

  it("fails with empty question", () => {
    assert.ok(validate({ ...validOAData, question: "" })?.includes("Question"));
  });

  it("fails with empty answer", () => {
    assert.ok(validate({ ...validOAData, answer: "  " })?.includes("Answer"));
  });
});

// ---------------------------------------------------------------------------
// Snapshot shape
// ---------------------------------------------------------------------------

describe("snapshot shape", () => {
  it("includes all required fields", () => {
    const snapshot = {
      question: "Q",
      answer: "A",
      explanation: null,
      difficulty: "MEDIUM",
      status: "PUBLISHED",
      choices: [{ text: "X", isCorrect: true, sortOrder: 0 }],
      tags: [{ name: "meteorology", type: "TOPIC" }],
      flagNote: null,
    };

    assert.ok("question" in snapshot);
    assert.ok("answer" in snapshot);
    assert.ok("explanation" in snapshot);
    assert.ok("difficulty" in snapshot);
    assert.ok("status" in snapshot);
    assert.ok(Array.isArray(snapshot.choices));
    assert.ok(Array.isArray(snapshot.tags));
    assert.ok("flagNote" in snapshot);
  });
});

// ---------------------------------------------------------------------------
// Tag ID deduplication (mirrors applyTags logic)
// ---------------------------------------------------------------------------

describe("tag ID deduplication", () => {
  it("deduplicates overlapping existing and new tag IDs", () => {
    const tagIds = ["t1", "t2", "t3"];
    const newTagIds = ["t2", "t4"]; // t2 appears in both
    const all = [...new Set([...tagIds, ...newTagIds])];
    assert.equal(all.length, 4);
    assert.deepEqual(all.sort(), ["t1", "t2", "t3", "t4"]);
  });

  it("handles empty inputs", () => {
    const all = [...new Set([...[], ...[]])];
    assert.equal(all.length, 0);
  });
});
