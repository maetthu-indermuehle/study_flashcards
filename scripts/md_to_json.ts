/**
 * One-off Markdown → JSON migration script.
 *
 * Reads every question file from Questions/ and writes one JSON file per
 * source file into data/questions/. The output files follow the canonical
 * format defined in docs/question_generation_guide.md and can be imported
 * directly with `npx tsx app/scripts/import.ts`.
 *
 * Run from the repo root:
 *   npx tsx scripts/md_to_json.ts [--verbose]
 *
 * ---------------------------------------------------------------------------
 * SUPPORTED MARKDOWN FORMATS
 * ---------------------------------------------------------------------------
 *
 * All formats share the same structural rules:
 *
 *   • Cards are separated by horizontal rules (---).
 *   • Fields use the bold-colon pattern: **FieldName:** value
 *     The colon sits INSIDE the bold markers: **Answer:** not **Answer**:.
 *   • Unknown **Bold:** lines are silently ignored (they are not structural).
 *   • A blank line ends the metadata block and begins the question text.
 *   • Multi-line field values are supported: indent continuation lines normally.
 *
 *
 * ── FORMAT 1: MET-style ────────────────────────────────────────────────────
 *
 * Header:  ## MET-NNN   (any integer, zero-padded or not)
 * Fields:  Topic, Type, Difficulty, Tags (all optional but recommended)
 * The question text follows the metadata block after a blank line.
 * Choices use the `- X) text` list format (A–D only).
 * Answer letter for MC: `**Answer:** B - text` (dash or em-dash separator).
 *
 *   ## MET-126
 *   **Topic:** Meteorology - Canadian Weather Products
 *   **Type:** Multiple Choice
 *   **Difficulty:** Basic
 *   **Tags:** nav-canada, weather-services
 *
 *   Who is responsible for providing civil aviation weather services in Canada?
 *
 *   - A) Federal Aviation Administration
 *   - B) NAV CANADA
 *   - C) Transport Canada only
 *   - D) Local flying clubs
 *
 *   **Answer:** B - NAV CANADA
 *
 *   **Explanation:** NAV CANADA provides civil air navigation services in
 *   Canada, including the aviation weather program.
 *
 *   **Reference:** NAV CANADA Aviation Weather Services Guide, Introduction
 *
 *   ---
 *
 *   ## MET-128
 *   **Topic:** Meteorology - Canadian Weather Products
 *   **Type:** Open Answer
 *   **Difficulty:** Basic
 *   **Tags:** self-briefing, fic
 *
 *   What is the difference between self-briefing and calling a FIC briefer?
 *
 *   **Answer:** Self-briefing lets a pilot review METARs, TAFs, and other
 *   products directly. Calling a FIC briefer adds professional interpretation
 *   tailored to the planned route and conditions.
 *
 *   **Explanation:** Both methods are useful; contact a briefer when conditions
 *   are complex, marginal, or changing.
 *
 *   **Reference:** NAV CANADA Aviation Weather Services Guide
 *
 *
 * ── FORMAT 2: Q-style ──────────────────────────────────────────────────────
 *
 * Header:  ## QNNN   (any integer, e.g. Q001, Q042)
 * Fields:  Topic, Type (Difficulty and Tags are not used in this format)
 * No --- separator before the first card (the file header shares the block).
 * The question text follows directly after the metadata fields and a blank line.
 *
 *   # PPL Flashcards — Air Law (Q001–Q100)
 *
 *   ## Q001
 *   **Topic:** Air Law — Collision Avoidance
 *   **Type:** Multiple Choice
 *
 *   When two aircraft are converging at approximately the same altitude,
 *   which aircraft must give way?
 *
 *   - A) The aircraft on the left
 *   - B) The aircraft that has the other on its right
 *   - C) The faster aircraft
 *   - D) The higher aircraft
 *
 *   **Answer:** B — The aircraft that has the other on its right
 *
 *   **Explanation:** Under CAR 602.19, the aircraft that has the other on its
 *   right must give way.
 *
 *   **Reference:** CAR 602.19; TP 11919 PSTAR S.1
 *
 *   ---
 *
 *   ## Q002
 *   ...
 *
 *
 * ── FORMAT 3: Sample-style ─────────────────────────────────────────────────
 *
 * Header:  ## Question N — Type   (N is an integer; Type sets the card type)
 * The question text is a bold line: **Question text?**  (no colon inside)
 * The answer field may be named "Correct Answer" instead of "Answer".
 * No Topic or Tags metadata; Type is parsed from the header.
 *
 *   ## Question 1 — Multiple Choice
 *
 *   **What are the four forces acting on an aircraft in flight?**
 *
 *   - A) Thrust, drag, gravity, and velocity
 *   - B) Lift, weight, thrust, and drag
 *   - C) Lift, momentum, thrust, and friction
 *   - D) Bernoulli force, weight, thrust, and resistance
 *
 *   **Correct Answer:** B — Lift, weight, thrust, and drag
 *
 *   **Explanation:** An aircraft in flight is under four main forces: lift,
 *   weight, thrust, and drag.
 *
 *   **Reference:** Transport Canada Flight Training Manual, Chapter 1, p. 3–4
 *
 *   ---
 *
 *   ## Question 3 — Open Answer
 *
 *   **Explain the difference between angle of incidence and angle of attack.**
 *
 *   **Answer:** The angle of incidence is a fixed structural angle built into
 *   the aircraft. The angle of attack is a variable aerodynamic angle between
 *   the wing chord and the relative airflow.
 *
 *   **Reference:** Transport Canada Flight Training Manual, Chapter 1, p. 5
 *
 *
 * ── FIELD REFERENCE ────────────────────────────────────────────────────────
 *
 *   Field            Formats        Notes
 *   ─────────────────────────────────────────────────────────────────────────
 *   **Topic:**       MET, Q         Free text; becomes a TOPIC tag in the DB
 *   **Type:**        MET, Q         "Multiple Choice" → MC; anything else → open
 *   **Difficulty:**  MET only       basic/easy → easy, intermediate/medium → medium,
 *                                   advanced/hard → hard; unknown values → null
 *   **Tags:**        MET only       Comma-separated; lowercased in output
 *   **Answer:**      all formats    MC: "B - text" or "B — text"; open: prose
 *   **Correct Answer:** Sample      Alias for Answer; same parsing rules
 *   **Explanation:** all formats    Optional; kept as-is
 *   **Reference:**   all formats    Optional; kept as-is
 *
 *   Choice lines (MC only):
 *     - A) option text
 *     - B) option text
 *     - C) option text
 *     - D) option text
 *   Only letters A–D are recognised. The correct choice is inferred from the
 *   answer letter, not from markup on the choice line itself.
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "fs";
import { dirname, join, resolve, basename, extname } from "path";

// ---------------------------------------------------------------------------
// Paths — resolved relative to the script file so the working directory
// does not matter.
// ---------------------------------------------------------------------------

const SCRIPT_DIR = dirname(resolve(process.argv[1]));
const REPO_ROOT = join(SCRIPT_DIR, "..");
const QUESTIONS_DIR = join(REPO_ROOT, "Questions");
const OUTPUT_DIR = join(REPO_ROOT, "data", "questions");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Files that are meta-documents, not question files. */
const SKIP_FILES = new Set(["MET_subtopics_plan.md"]);

const DIFFICULTY_MAP: Record<string, "easy" | "medium" | "hard"> = {
  basic: "easy",
  easy: "easy",
  intermediate: "medium",
  medium: "medium",
  advanced: "hard",
  hard: "hard",
};

/**
 * Only these field names are treated as structural delimiters.
 * Any `**Other:**` pattern inside an answer/explanation is kept as content.
 */
const KNOWN_FIELDS = new Set([
  "Topic",
  "Type",
  "Difficulty",
  "Tags",
  "Answer",
  "Correct Answer",
  "Explanation",
  "Reference",
]);

/** Fields that belong to the card metadata block (before the question text). */
const METADATA_FIELDS = new Set(["Topic", "Type", "Difficulty", "Tags"]);

// ---------------------------------------------------------------------------
// Output type — matches the JSON format spec in question_generation_guide.md
// ---------------------------------------------------------------------------

type OutputChoice = { text: string; correct: boolean };

type OutputCard = {
  id: string;
  topic: string | null;
  type: "multiple_choice" | "open_answer";
  difficulty: "easy" | "medium" | "hard" | null;
  tags: string[];
  question: string;
  choices?: OutputChoice[];
  answer: string;
  explanation: string | null;
  reference: string | null;
  media: [];
};

// ---------------------------------------------------------------------------
// Block-level parser
// ---------------------------------------------------------------------------

type ParseResult = { card: OutputCard | null; warnings: string[] };

/**
 * Parses a single card block (the text between two `---` separators) into a
 * structured {@link OutputCard}. Returns `null` for blocks that don't contain
 * a recognisable card header.
 */
function parseBlock(rawBlock: string): ParseResult {
  const warnings: string[] = [];
  const lines = rawBlock.split("\n").map((l) => l.trimEnd());

  // ---- Detect format from header ------------------------------------------

  const header = lines.find((l) => l.trim().startsWith("## "))?.trim() ?? "";

  const metMatch = header.match(/^## (MET-\d+)/);
  const qMatch = header.match(/^## (Q\d+)/);
  const sampleMatch = header.match(/^## Question (\d+)\s*[-—]\s*(.+)/i);

  if (!metMatch && !qMatch && !sampleMatch) {
    return { card: null, warnings: [] };
  }

  let id: string;
  let format: "MET" | "Q" | "SAMPLE";
  let typeFromHeader: string | null = null;

  if (metMatch) {
    id = metMatch[1];
    format = "MET";
  } else if (qMatch) {
    id = qMatch[1];
    format = "Q";
  } else {
    // sampleMatch is defined here
    id = `SAMPLE-${sampleMatch![1].padStart(3, "0")}`;
    format = "SAMPLE";
    typeFromHeader = sampleMatch![2].trim();
  }

  // ---- Line-by-line state machine -----------------------------------------
  //
  // States:
  //   inMetadataSection — we're processing Topic/Type/Difficulty/Tags lines
  //   inQuestionSection — we're collecting free-text question lines
  //   currentField      — we're collecting a named field's value lines
  //
  // Transitions:
  //   metadata field encountered → set inMetadataSection = true
  //   blank line while inMetadataSection → switch to inQuestionSection
  //   known content field (Answer/Explanation/Reference) → clear both flags
  //   choice line encountered → clear both flags

  const fieldValues = new Map<string, string[]>();
  const choices: OutputChoice[] = [];
  const questionLines: string[] = [];

  let currentField: string | null = null;
  let currentFieldLines: string[] = [];
  let inMetadataSection = true;
  let inQuestionSection = false;
  let pastHeader = false;

  const flushField = () => {
    if (currentField !== null) {
      fieldValues.set(currentField, [...currentFieldLines]);
      currentField = null;
      currentFieldLines = [];
    }
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    // Skip everything up to and including the header line
    if (!pastHeader) {
      if (trimmed.startsWith("## ")) pastHeader = true;
      continue;
    }

    // Check for a known field (e.g. **Answer:** text)
    let matchedField: string | null = null;
    let matchedValue = "";
    for (const name of KNOWN_FIELDS) {
      // The colon sits *inside* the bold markers: **Answer:** not **Answer**:
      // Escape the space in "Correct Answer" for the regex.
      const escaped = name.replace(" ", "\\s+");
      const re = new RegExp(`^\\*\\*${escaped}:\\*\\*\\s*(.*)`, "i");
      const m = trimmed.match(re);
      if (m) {
        matchedField = name;
        matchedValue = m[1].trim();
        break;
      }
    }

    // Check for a choice line: - A) text
    const choiceMatch = trimmed.match(/^-\s+([A-D])\)\s+(.+)/);

    // Check for a bold-only question line (Sample format):
    // **Question text?** — has opening ** and closing ** but no **: in between
    const boldQuestion =
      format === "SAMPLE" &&
      !matchedField &&
      /^\*\*.+\*\*\s*$/.test(trimmed) &&
      !trimmed.includes("**:");

    if (matchedField) {
      flushField();
      // Use lowercase key for storage
      const key = matchedField.toLowerCase().replace(/\s+/g, "_");
      currentField = key;
      currentFieldLines = matchedValue ? [matchedValue] : [];
      if (METADATA_FIELDS.has(matchedField)) {
        inMetadataSection = true;
        inQuestionSection = false;
      } else {
        inMetadataSection = false;
        inQuestionSection = false;
      }
    } else if (choiceMatch) {
      flushField();
      // Will mark correct after we parse the answer field
      choices.push({ text: choiceMatch[2].trim(), correct: false });
      // Store the letter alongside (overwritten after; see correction below)
      (choices[choices.length - 1] as OutputChoice & { _letter?: string })._letter =
        choiceMatch[1];
      inMetadataSection = false;
      inQuestionSection = false;
    } else if (boldQuestion) {
      // Extract text between the ** markers
      const inner = trimmed.replace(/^\*\*/, "").replace(/\*\*\s*$/, "");
      flushField();
      questionLines.push(inner.trim());
      inMetadataSection = false;
      inQuestionSection = true;
    } else if (!trimmed) {
      // Blank line
      if (inMetadataSection) {
        // Transition: metadata block → question text
        flushField();
        inMetadataSection = false;
        inQuestionSection = true;
      } else if (currentField) {
        // Paragraph break inside a multi-line field (e.g. long open answer)
        currentFieldLines.push("");
      }
      // Blank lines in the question region are ignored (single-line questions)
    } else {
      // Regular text line
      if (currentField !== null) {
        currentFieldLines.push(trimmed);
      } else if (inQuestionSection) {
        questionLines.push(trimmed);
      }
      // Lines before any known field in the metadata region (e.g. **Original ID:**
      // in MET_all_deduplicated.md) are silently ignored.
    }
  }
  flushField();

  // ---- Extract and validate parsed values ---------------------------------

  const getVal = (...keys: string[]): string | null => {
    for (const key of keys) {
      const v = fieldValues.get(key);
      if (v && v.length > 0) {
        const text = v.join("\n").trim();
        if (text) return text;
      }
    }
    return null;
  };

  const topicRaw = getVal("topic");
  const typeRaw = getVal("type") ?? typeFromHeader;
  const difficultyRaw = getVal("difficulty");
  const tagsRaw = getVal("tags");
  const answerRaw = getVal("answer", "correct_answer");
  const explanationRaw = getVal("explanation");
  const referenceRaw = getVal("reference");

  if (!answerRaw) {
    return { card: null, warnings: [`${id}: no answer field — skipped`] };
  }

  const questionText = questionLines.join(" ").trim();
  if (!questionText) {
    return { card: null, warnings: [`${id}: no question text — skipped`] };
  }

  // ---- Map card type -------------------------------------------------------
  //
  // Only "Multiple Choice" maps to multiple_choice. Everything else
  // (Open Answer, Scenario Based, Image Interpretation, etc.) is open_answer.

  const cardType: "multiple_choice" | "open_answer" =
    typeRaw?.toLowerCase().replace(/[\s_-]/g, "").includes("multiplechoice")
      ? "multiple_choice"
      : "open_answer";

  // ---- Parse answer letter and text ----------------------------------------
  //
  // MC answers: "B - NAV CANADA" or "B — some text" → letter B, text after separator
  // Open answers: full prose text, no letter prefix

  const answerMatch = answerRaw.match(/^([A-D])\s*[-—]\s*(.+)/s);
  const answerLetter = answerMatch ? answerMatch[1] : null;
  const answerText = answerMatch ? answerMatch[2].trim() : answerRaw.trim();

  // ---- Mark correct choices ------------------------------------------------

  if (cardType === "multiple_choice") {
    if (choices.length === 0) {
      warnings.push(`${id}: MC card has no choices`);
    }
    if (!answerLetter) {
      warnings.push(`${id}: MC answer has no letter prefix`);
    }
    // Apply isCorrect based on the answer letter
    for (const choice of choices) {
      const c = choice as OutputChoice & { _letter?: string };
      choice.correct = c._letter === answerLetter;
      delete c._letter;
    }
    if (choices.length > 0 && !choices.some((c) => c.correct)) {
      warnings.push(`${id}: no choice marked correct (answer letter "${answerLetter}")`);
    }
  } else {
    // Clean up the _letter property on open-answer choices (should be empty)
    for (const choice of choices) {
      delete (choice as OutputChoice & { _letter?: string })._letter;
    }
  }

  // ---- Difficulty ----------------------------------------------------------

  const difficulty: "easy" | "medium" | "hard" | null = difficultyRaw
    ? (DIFFICULTY_MAP[difficultyRaw.toLowerCase()] ?? null)
    : null;

  if (difficultyRaw && difficulty === null) {
    warnings.push(`${id}: unknown difficulty "${difficultyRaw}" — set to null`);
  }

  // ---- Tags ----------------------------------------------------------------

  const tags = tagsRaw
    ? tagsRaw
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
    : [];

  // ---- Build output card ---------------------------------------------------

  const card: OutputCard = {
    id,
    topic: topicRaw,
    type: cardType,
    difficulty,
    tags,
    question: questionText,
    ...(cardType === "multiple_choice" ? { choices } : {}),
    answer: answerText,
    explanation: explanationRaw,
    reference: referenceRaw,
    media: [],
  };

  return { card, warnings };
}

// ---------------------------------------------------------------------------
// File-level parser
// ---------------------------------------------------------------------------

/**
 * Parses a Markdown file and returns all recognised cards plus any warnings.
 */
function parseFile(filePath: string): {
  cards: OutputCard[];
  warnings: string[];
  skipped: number;
} {
  const raw = readFileSync(filePath, "utf-8");

  // Split into blocks on horizontal rule separators.
  // Trim each block and discard clearly empty ones.
  const blocks = raw
    .split(/\n---+\n/)
    .map((b) => b.trim())
    // Use multiline flag so ^ matches any line, not just start of string.
    // This handles files where the first card shares a block with the file header.
    .filter((b) => b.length > 0 && /^## /m.test(b));

  const cards: OutputCard[] = [];
  const warnings: string[] = [];
  let skipped = 0;

  for (const block of blocks) {
    const { card, warnings: blockWarnings } = parseBlock(block);
    warnings.push(...blockWarnings);
    if (card) {
      cards.push(card);
    } else if (blockWarnings.length === 0) {
      // Silently dropped (not a card block)
    } else {
      skipped++;
    }
  }

  return { cards, warnings, skipped };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const verbose = process.argv.includes("--verbose");

mkdirSync(OUTPUT_DIR, { recursive: true });

const mdFiles = readdirSync(QUESTIONS_DIR)
  .filter((f) => extname(f) === ".md" && !SKIP_FILES.has(f))
  .sort();

let totalCards = 0;
let totalWarnings = 0;
let totalSkipped = 0;

console.log(`Converting ${mdFiles.length} Markdown files → ${OUTPUT_DIR}\n`);

for (const mdFile of mdFiles) {
  const inputPath = join(QUESTIONS_DIR, mdFile);
  const outputFile = basename(mdFile, ".md") + ".json";
  const outputPath = join(OUTPUT_DIR, outputFile);

  const { cards, warnings, skipped } = parseFile(inputPath);

  writeFileSync(outputPath, JSON.stringify(cards, null, 2) + "\n", "utf-8");

  const status =
    warnings.length > 0 || skipped > 0
      ? `${cards.length} cards, ${skipped} skipped, ${warnings.length} warning(s)`
      : `${cards.length} cards`;

  console.log(`  ${mdFile} → ${outputFile}  [${status}]`);

  if (verbose || warnings.length > 0) {
    for (const w of warnings) {
      console.log(`      WARN  ${w}`);
    }
  }

  totalCards += cards.length;
  totalWarnings += warnings.length;
  totalSkipped += skipped;
}

console.log(
  `\nDone. ${totalCards} cards written, ${totalSkipped} skipped, ${totalWarnings} warning(s).`,
);
if (totalWarnings > 0) {
  console.log("Re-run with --verbose to see all warnings.");
}
