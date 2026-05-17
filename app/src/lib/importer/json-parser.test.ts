import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseJsonCards } from "./json-parser";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function json(cards: unknown[]): string {
  return JSON.stringify(cards);
}

const MC_SINGLE: object = {
  id: "MET-126",
  topic: "Meteorology - Canadian Weather Products",
  type: "multiple_choice",
  difficulty: "easy",
  tags: ["nav-canada", "weather-services"],
  question: "Who provides civil aviation weather services in Canadian airspace?",
  choices: [
    { text: "Federal Aviation Administration", correct: false },
    { text: "NAV CANADA", correct: true },
    { text: "Transport Canada only", correct: false },
    { text: "Local flying clubs", correct: false },
  ],
  answer: "NAV CANADA",
  explanation: "NAV CANADA provides civil air navigation services in Canada.",
  reference: "NAV CANADA Aviation Weather Services Guide, Introduction",
};

const MC_MULTI: object = {
  id: "MET-201",
  topic: "Meteorology - Canadian Weather Products",
  type: "multiple_choice",
  difficulty: "medium",
  tags: ["metar", "speci"],
  question: "Which are current weather observation reports? Select all that apply.",
  choices: [
    { text: "METAR", correct: true },
    { text: "TAF", correct: false },
    { text: "SPECI", correct: true },
    { text: "GFA", correct: false },
  ],
  answer: "METAR and SPECI",
  explanation: "METARs are routine hourly observations; SPECIs are special observations.",
  reference: "NAV CANADA Aviation Weather Services Guide, Weather Observations",
};

const OPEN_ANSWER: object = {
  id: "MET-128",
  topic: "Meteorology - Canadian Weather Products",
  type: "open_answer",
  difficulty: "easy",
  tags: ["fic", "pilot-briefing"],
  question: "What is the difference between self-briefing and calling a FIC briefer?",
  answer: "Self-briefing gives you raw data; a FIC briefer synthesizes it.",
  explanation: "Both methods are valid; a briefer is required for IFR.",
  reference: "NAV CANADA Aviation Weather Services Guide, Aviation Weather Web Site",
};

const WITH_MEDIA: object = {
  ...MC_SINGLE,
  id: "MET-350",
  media: [
    {
      kind: "image",
      role: "question_context",
      src: "https://example.com/gfa-sample.png",
      alt: "GFA clouds and weather panel",
      caption: "GFA valid 0000Z to 1200Z",
      attribution: "NAV CANADA, used with permission",
      origin: "https://www.navcanada.ca",
    },
  ],
};

const NULL_FIELDS: object = {
  id: "Q001",
  topic: "Air Law - Collision Avoidance",
  type: "multiple_choice",
  difficulty: null,
  tags: [],
  question: "When two aircraft are converging, which must give way?",
  choices: [
    { text: "The aircraft on the left", correct: false },
    { text: "The aircraft that has the other on its right", correct: true },
  ],
  answer: "The aircraft that has the other on its right",
  explanation: null,
  reference: null,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("parseJsonCards", () => {
  describe("multiple-choice cards", () => {
    it("parses a single-correct MC card", () => {
      const [card] = parseJsonCards(json([MC_SINGLE]));
      assert.equal(card.sourceId, "MET-126");
      assert.equal(card.cardType, "MULTIPLE_CHOICE");
      assert.equal(card.topic, "Meteorology - Canadian Weather Products");
      assert.equal(card.difficulty, "EASY");
      assert.deepEqual(card.tags, ["nav-canada", "weather-services"]);
      assert.equal(card.questionText, "Who provides civil aviation weather services in Canadian airspace?");
      assert.equal(card.answerText, "NAV CANADA");
      assert.equal(card.choices.length, 4);
    });

    it("maps correct:true/false to isCorrect on every choice", () => {
      const [card] = parseJsonCards(json([MC_SINGLE]));
      const correct = card.choices.filter((c) => c.isCorrect);
      const wrong = card.choices.filter((c) => !c.isCorrect);
      assert.equal(correct.length, 1);
      assert.equal(correct[0].text, "NAV CANADA");
      assert.equal(wrong.length, 3);
    });

    it("parses a multi-correct MC card with two correct choices", () => {
      const [card] = parseJsonCards(json([MC_MULTI]));
      const correct = card.choices.filter((c) => c.isCorrect);
      assert.equal(correct.length, 2);
      assert.equal(correct[0].text, "METAR");
      assert.equal(correct[1].text, "SPECI");
    });

    it("preserves choice text exactly", () => {
      const [card] = parseJsonCards(json([MC_SINGLE]));
      assert.deepEqual(
        card.choices.map((c) => c.text),
        ["Federal Aviation Administration", "NAV CANADA", "Transport Canada only", "Local flying clubs"]
      );
    });
  });

  describe("open-answer cards", () => {
    it("parses an open-answer card with no choices field", () => {
      const [card] = parseJsonCards(json([OPEN_ANSWER]));
      assert.equal(card.cardType, "OPEN_ANSWER");
      assert.equal(card.choices.length, 0);
      assert.equal(card.answerText, "Self-briefing gives you raw data; a FIC briefer synthesizes it.");
    });
  });

  describe("difficulty mapping", () => {
    it('maps "easy" to "EASY"', () => {
      const [card] = parseJsonCards(json([{ ...MC_SINGLE, difficulty: "easy" }]));
      assert.equal(card.difficulty, "EASY");
    });

    it('maps "medium" to "MEDIUM"', () => {
      const [card] = parseJsonCards(json([{ ...MC_SINGLE, difficulty: "medium" }]));
      assert.equal(card.difficulty, "MEDIUM");
    });

    it('maps "hard" to "HARD"', () => {
      const [card] = parseJsonCards(json([{ ...MC_SINGLE, difficulty: "hard" }]));
      assert.equal(card.difficulty, "HARD");
    });

    it("maps null difficulty to null", () => {
      const [card] = parseJsonCards(json([NULL_FIELDS]));
      assert.equal(card.difficulty, null);
    });
  });

  describe("nullable fields", () => {
    it("passes through null explanation and reference", () => {
      const [card] = parseJsonCards(json([NULL_FIELDS]));
      assert.equal(card.explanation, null);
      assert.equal(card.reference, null);
    });

    it("passes through null topic", () => {
      const [card] = parseJsonCards(json([{ ...MC_SINGLE, topic: null }]));
      assert.equal(card.topic, null);
    });
  });

  describe("media", () => {
    it("parses a card with a media array", () => {
      const [card] = parseJsonCards(json([WITH_MEDIA]));
      assert.equal(card.media.length, 1);
      const m = card.media[0];
      assert.equal(m.kind, "image");
      assert.equal(m.role, "question_context");
      assert.equal(m.src, "https://example.com/gfa-sample.png");
      assert.equal(m.alt, "GFA clouds and weather panel");
      assert.equal(m.caption, "GFA valid 0000Z to 1200Z");
      assert.equal(m.attribution, "NAV CANADA, used with permission");
      assert.equal(m.origin, "https://www.navcanada.ca");
    });

    it("defaults to empty media array when field is absent", () => {
      const [card] = parseJsonCards(json([MC_SINGLE]));
      assert.deepEqual(card.media, []);
    });
  });

  describe("edge cases", () => {
    it("returns an empty array for an empty JSON array", () => {
      const cards = parseJsonCards("[]");
      assert.deepEqual(cards, []);
    });

    it("parses multiple cards in one file", () => {
      const cards = parseJsonCards(json([MC_SINGLE, OPEN_ANSWER, NULL_FIELDS]));
      assert.equal(cards.length, 3);
      assert.equal(cards[0].sourceId, "MET-126");
      assert.equal(cards[1].sourceId, "MET-128");
      assert.equal(cards[2].sourceId, "Q001");
    });
  });

  describe("error handling", () => {
    it("throws on malformed JSON", () => {
      assert.throws(
        () => parseJsonCards("{not valid json"),
        (err: Error) => {
          assert.ok(err.message.includes("Invalid JSON"));
          return true;
        }
      );
    });

    it("throws when the top-level value is not an array", () => {
      assert.throws(() => parseJsonCards('{"id": "MET-1"}'));
    });

    it("throws when a required field is missing", () => {
      const bad = [{ ...MC_SINGLE, id: undefined }];
      assert.throws(() => parseJsonCards(JSON.stringify(bad)));
    });

    it("throws when type has an invalid value", () => {
      const bad = [{ ...MC_SINGLE, type: "true_false" }];
      assert.throws(() => parseJsonCards(JSON.stringify(bad)));
    });

    it("throws when difficulty has an invalid value", () => {
      const bad = [{ ...MC_SINGLE, difficulty: "basic" }];
      assert.throws(() => parseJsonCards(JSON.stringify(bad)));
    });

    it("throws when a choice is missing the correct field", () => {
      const bad = [
        {
          ...MC_SINGLE,
          choices: [{ text: "NAV CANADA" }], // missing correct
        },
      ];
      assert.throws(() => parseJsonCards(JSON.stringify(bad)));
    });
  });
});
