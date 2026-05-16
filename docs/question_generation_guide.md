# Question Generation Guide

This document defines the format for creating new flashcard questions for the Canadian
PPL study app. Paste the relevant sections into ChatGPT or Claude when asking it to
generate questions, then import the resulting JSON with the CLI importer.

---

## Quick-start prompt

Copy this block and append your topic request at the end:

```
You are writing flashcard questions for a Canadian Private Pilot Licence (PPL) ground
school study app. Output a JSON array of question objects. Follow the format and rules
below exactly.

--- FORMAT ---

Each object in the array must have these fields:

{
  "id":          string   — unique identifier, e.g. "MET-600" or "AIRLAW-250"
  "topic":       string   — subject area, e.g. "Meteorology - Icing" or "Air Law - Right of Way"
  "type":        "multiple_choice" | "open_answer"
  "difficulty":  "basic" | "intermediate" | "advanced"
  "tags":        string[] — 2–5 lowercase kebab-case tags, e.g. ["metar", "canadian-products"]
  "question":    string   — the full question text, plain prose, no markdown bold
  "choices":     Choice[] — required for multiple_choice, omit for open_answer (see below)
  "answer":      string   — for multiple_choice: the correct choice text only (no letter prefix)
                          — for open_answer: the full model answer, 2–5 sentences
  "explanation": string   — why the answer is correct; include any common traps or misconceptions
  "reference":   string   — the authoritative Canadian source (TC manual, CAR, NAV CANADA guide, etc.)
}

Choice object (multiple_choice only):
{
  "letter":   "A" | "B" | "C" | "D"
  "text":     string   — answer option text, no letter prefix
  "correct":  true     — present only on the correct choice; omit on wrong choices
}

--- RULES ---

1. Every question must have exactly one correct choice (multiple_choice) or a complete
   prose answer (open_answer).
2. Wrong choices must be plausible — avoid obviously silly distractors.
3. The explanation must add information beyond just restating the answer. Mention the
   rule number, document section, or underlying reason.
4. The reference must be a real Canadian source:
   - Transport Canada Flight Training Manual (TP1102E)
   - Canadian Aviation Regulations (CARs), cite the specific regulation number
   - AIM — Aeronautical Information Manual (TP14371)
   - NAV CANADA Aviation Weather Services Guide
   - Transport Canada Weather for Pilots (TP7991)
   - PSTAR study guide (TP11919)
   - Pilot's Operating Handbook (POH) — only for aircraft-specific questions
5. IDs must follow the pattern PREFIX-NUMBER, where PREFIX is an uppercase abbreviation
   of the topic area and NUMBER is a sequential integer. Use the starting number I give
   you.
6. Tags must be lowercase, hyphen-separated, and specific enough to be useful for
   filtering (e.g. "vfr-weather-minima" not "weather").
7. Output only the JSON array — no explanation, no markdown fences, no preamble.

--- END FORMAT ---

Generate [NUMBER] questions on the topic: [YOUR TOPIC HERE].
Start IDs at [PREFIX-NUMBER].
```

---

## JSON format reference

### Multiple-choice example

```json
{
  "id": "MET-126",
  "topic": "Meteorology - Canadian Weather Products",
  "type": "multiple_choice",
  "difficulty": "basic",
  "tags": ["nav-canada", "weather-services", "canadian-products"],
  "question": "Who is responsible for providing civil aviation weather services in Canadian domestic airspace?",
  "choices": [
    { "letter": "A", "text": "Federal Aviation Administration" },
    { "letter": "B", "text": "NAV CANADA", "correct": true },
    { "letter": "C", "text": "Transport Canada only" },
    { "letter": "D", "text": "Local flying clubs" }
  ],
  "answer": "NAV CANADA",
  "explanation": "NAV CANADA provides civil air navigation services in Canada, including the aviation weather program. Much of the meteorological information originates from Environment and Climate Change Canada through service arrangements. The FAA has no jurisdiction in Canadian airspace.",
  "reference": "NAV CANADA Aviation Weather Services Guide, Introduction and Aviation Weather Services"
}
```

### Open-answer example

```json
{
  "id": "MET-128",
  "topic": "Meteorology - Canadian Weather Products",
  "type": "open_answer",
  "difficulty": "basic",
  "tags": ["self-briefing", "fic", "pilot-briefing"],
  "question": "What is the difference between self-briefing with online Canadian aviation weather products and calling a Flight Information Centre (FIC) briefer?",
  "answer": "Self-briefing lets a pilot review products such as METARs, TAFs, GFAs, PIREPs, radar, satellite imagery, weather charts, and NOTAMs directly. Calling a FIC briefer adds professional interpretation of the weather situation, tailored to the planned route, timing, altitude, aircraft, and pilot questions. A good practice is to review the big picture first, then contact a briefer when the situation is complicated, marginal, or changing.",
  "explanation": "Self-briefing gives you raw data; a FIC briefer synthesizes it. The briefer can flag hazards you may have missed and is required for IFR flight plans in Canada. For VFR, self-briefing is legal but calling a briefer is strongly recommended in complex weather.",
  "reference": "NAV CANADA Aviation Weather Services Guide, Aviation Weather Web Site and Weather Briefing Tips"
}
```

---

## Field definitions

| Field | Required | Notes |
|-------|----------|-------|
| `id` | Yes | Unique per deck. Use a topic prefix + number. Gaps are fine. |
| `topic` | Yes | Plain English. Consistent within a subject area. |
| `type` | Yes | `"multiple_choice"` or `"open_answer"` only. |
| `difficulty` | Yes | `"basic"` = recall a fact; `"intermediate"` = apply a rule; `"advanced"` = interpret or calculate. |
| `tags` | Yes | 2–5 tags. Use existing tags where possible to keep filtering consistent. |
| `question` | Yes | Plain prose. No bold, no markdown. Ends with a question mark. |
| `choices` | MC only | Exactly four choices: A, B, C, D. Exactly one with `"correct": true`. |
| `answer` | Yes | MC: correct choice text. Open: model answer in 2–5 sentences. |
| `explanation` | Yes | Must go beyond restating the answer. Reference the rule or underlying reason. |
| `reference` | Yes | Real Canadian source. Cite the document name and chapter/section/regulation. |

---

## Existing topic prefixes and ID ranges

Keep new IDs outside these ranges to avoid collisions with existing cards.

| Prefix | Topic area | Used range |
|--------|------------|------------|
| `MET` | Meteorology | 126–620 |
| `Q` | Air Law (PSTAR focus) | 001–300 (estimated) |

When generating new questions, start your IDs after the highest used number in that
prefix, or introduce a new prefix for a new subject area.

### Suggested new prefixes

| Prefix | Topic area |
|--------|------------|
| `AERO` | Aerodynamics and aircraft performance |
| `NAV` | Navigation |
| `RADIO` | Radiotelephony and communication |
| `AIRLAW` | Air law (new structured series) |
| `WX` | Weather theory (not Canadian-product-specific) |
| `POH` | Aircraft systems and POH knowledge |
| `HUMAN` | Human factors |

---

## Importing generated questions

Once you have the JSON array from the LLM, save it as a `.json` file and run:

```bash
docker compose exec app npx tsx scripts/import.ts path/to/questions.json --dry-run
```

Review the dry-run output for validation errors, then run without `--dry-run` to import.
