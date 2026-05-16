# Phase 2 Implementation Plan — JSON Importer

## Goal

Populate the "Canadian PPL" deck in PostgreSQL from the canonical JSON question format.
The app only ever reads JSON. A one-off migration script (outside the app) converts the
existing Markdown files to JSON once, and the output is committed to the repository.

All future questions — whether written by hand or generated with an LLM — are authored
in JSON using the format defined in `docs/question_generation_guide.md`.

---

## Two separate concerns

### 1. One-off Markdown migration (repo-level script, run once)

Location: `scripts/md_to_json.ts`

This script lives at the repository root, not inside the app. It is a throwaway
conversion tool. It reads the existing Markdown files from `Questions/`, parses all
three format variants, and writes one JSON file per source file into `data/questions/`.

The output JSON files are committed to the repository. After that, the Markdown files
are no longer needed for import purposes.

Run it once locally:
```bash
npx tsx scripts/md_to_json.ts
```

No npm install needed if `tsx` is available globally. Otherwise install it temporarily:
```bash
npx --yes tsx scripts/md_to_json.ts
```

### 2. App JSON importer (production code, reused every time)

Location: `app/src/lib/importer/` and `app/scripts/import.ts`

This is the permanent import path. It reads JSON files only. It is used to load the
migrated questions and for all future question batches.

---

## Markdown formats (migration script concern only)

The migration script must handle three format variants found in `Questions/`. This
complexity is intentional isolated in the migration script so the app never has to
deal with it.

### Format A — MET-style (`MET_*.md`)

```markdown
## MET-126
**Topic:** Meteorology - Canadian Weather Products
**Type:** Multiple Choice
**Difficulty:** Basic
**Tags:** nav-canada, weather-services, canadian-products

Question text here?

- A) Option one
- B) Option two
- C) Option three
- D) Option four

**Answer:** B - NAV CANADA

**Explanation:** ...

**Reference:** ...
```

### Format B — Q-style (`questions_*.md`)

```markdown
## Q001
**Topic:** Air Law — Collision Avoidance
**Type:** Multiple Choice

Question text here?

- A) Option one
- B) Option two
- C) Option three
- D) Option four

**Answer:** B — The aircraft that has the other on its right

**Explanation:** ...

**Reference:** ...
```

No Difficulty or Tags in most files. Answer separator is em dash instead of plain dash.

### Format C — Sample-style (`sample_questions.md`)

```markdown
## Question 1 — Multiple Choice

**What are the four forces acting on an aircraft in flight?**

- A) Option one
- B) Option two
- C) Option three
- D) Option four

**Correct Answer:** B — Lift, weight, thrust, and drag

**Explanation:** ...

**Reference:** ...
```

Type is in the heading. Question text is bold. Answer field is `**Correct Answer:**`.

---

## Deliverables

### 1. Migration script (`scripts/md_to_json.ts`)

One-off script at the repository root. Converts all Markdown files in `Questions/` to
JSON and writes them to `data/questions/`.

```
scripts/md_to_json.ts

Output:
  data/questions/MET_126_175_canadian_weather_products.json
  data/questions/MET_446_495_icing_gaps.json
  data/questions/questions_airlaw.json
  ... one file per source Markdown file
```

Each output file is a JSON array of card objects matching the format in
`docs/question_generation_guide.md`. Missing fields (e.g. no Difficulty in Q-style
files) are written as `null`.

The script prints a summary of cards converted and any fields it could not extract,
so they can be fixed manually before import.

### 2. JSON parser (`app/src/lib/importer/json-parser.ts`)

Parses a JSON file (array of card objects per `question_generation_guide.md`) into the
shared `ParsedCard` type. Validates the JSON structure and maps field names.

```typescript
type ParsedChoice = {
  letter: string;    // "A", "B", "C", "D"
  text: string;
  isCorrect: boolean;
};

type ParsedCard = {
  sourceId: string;
  topic: string | null;
  cardType: "MULTIPLE_CHOICE" | "OPEN_ANSWER";
  difficulty: "BASIC" | "INTERMEDIATE" | "ADVANCED" | null;
  tags: string[];
  questionText: string;
  choices: ParsedChoice[];   // empty for open-answer cards
  answerText: string;
  explanation: string | null;
  reference: string | null;
};
```

### 3. Validator (`app/src/lib/importer/validator.ts`)

Validates a `ParsedCard[]` array and returns `ValidationError[]`. Does not throw.

Checks:
- `MISSING_ANSWER` — no answer text.
- `NO_CORRECT_CHOICE` — multiple-choice card with no `isCorrect` choice.
- `MISSING_REFERENCE` — no reference text.
- `DUPLICATE_SOURCE_ID` — same `sourceId` appears twice in the batch.
- `EMPTY_QUESTION` — blank question text.

### 4. Import service (`app/src/lib/importer/import-service.ts`)

Writes validated cards to the database. All operations run in a single transaction.

Steps per import run:
1. Resolve the target deck (looked up by name and owner).
2. Create an `ImportBatch` row with status `PROCESSING`.
3. For each card, upsert by `(deckId, sourceId)` — safe to re-run.
4. For multiple-choice cards, replace the `Choice` rows for the card.
5. Upsert `Tag` rows and `CardTag` links.
6. Upsert a `SourceReference` row if a reference string is present.
7. Mark `ImportBatch` as `COMPLETED` (or `FAILED` on error).

### 5. CLI script (`app/scripts/import.ts`)

```
npx tsx scripts/import.ts <file.json> [options]

Options:
  --dry-run    Parse and validate only; do not write to the database.
  --verbose    Print each card as it is processed.
```

Output:
```
Parsing data/questions/MET_126_175_canadian_weather_products.json...
  Parsed:   50 cards
  Errors:    0

Importing into deck "Canadian PPL"...
  Created:  48 cards
  Updated:   2 cards

Done. ImportBatch id: cmp...
```

### 6. Unit tests

`app/src/lib/importer/json-parser.test.ts`:
- Parses a valid multiple-choice card correctly.
- Parses a valid open-answer card correctly.
- Maps `"correct": true` to `isCorrect: true` on the right choice.
- Handles a card with `null` difficulty gracefully.
- Returns an empty array for an empty JSON array input.
- Throws a clear error for malformed JSON.

`app/src/lib/importer/validator.test.ts`:
- Passes a valid card set.
- Reports `MISSING_REFERENCE` when reference is `null`.
- Reports `NO_CORRECT_CHOICE` for a multiple-choice card with no marked answer.
- Reports `DUPLICATE_SOURCE_ID` for two cards sharing the same id.

---

## Files to create or modify

| Path | Action |
|------|--------|
| `scripts/md_to_json.ts` | Create — one-off Markdown → JSON migration (repo root) |
| `data/questions/*.json` | Generated by migration script, then committed |
| `app/src/lib/importer/json-parser.ts` | Create |
| `app/src/lib/importer/validator.ts` | Create |
| `app/src/lib/importer/import-service.ts` | Create |
| `app/scripts/import.ts` | Create — CLI entry point (JSON only) |
| `app/src/lib/importer/json-parser.test.ts` | Create |
| `app/src/lib/importer/validator.test.ts` | Create |
| `app/package.json` | Add `"import"` script shortcut |
| `app/src/app/page.tsx` | Update Phase badge to Phase 2 |
| `docs/project_status.md` | Mark Phase 2 in progress |
| `docs/question_generation_guide.md` | Already created — LLM prompt + JSON spec |

No new npm dependencies needed. Uses Prisma (already installed), Node built-ins
(`fs`, `path`), and `dotenv/config`.

---

## Build order

1. Migration script — convert `Questions/` to `data/questions/*.json`, review output.
2. JSON parser + tests (pure function, no DB).
3. Validator + tests (pure function).
4. Import service (DB integration).
5. CLI script wiring it together.
6. Dry-run smoke test: `docker compose exec app npx tsx scripts/import.ts /data/questions/sample_questions.json --dry-run`
7. Full import of all files in `data/questions/`.
8. Update page badge and project status.

---

## Out of scope for Phase 2

- Markdown import in the app (handled entirely by the one-off migration script).
- Import UI in the browser (Phase 8).
- Media/image attachment (Phase 7).
- Duplicate question-text detection across batches (Phase 6 or 8).
- Progress/scheduling data — cards are created in `NEW` status with no `CardProgress`
  row; the scheduler in Phase 5 creates those on first study.
