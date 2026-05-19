# Question Generation Guide

This document defines the canonical JSON format for flashcard questions in the Canadian
PPL study app. It serves two purposes:

1. **For the importer** — this is the contract the JSON parser is built against.
2. **For LLM generation** — paste the quick-start prompt into ChatGPT or Claude when
   generating new questions, then import the resulting JSON with the CLI importer.

---

## JSON format specification

### File structure

A question file can use one of two formats:

**New format (preferred)** — wrapper object with a `subject` field:

```json
{
  "subject": "Canadian PPL",
  "cards": [
    { ...card },
    { ...card }
  ]
}
```

The `subject` value becomes the **deck name** in the app. Use it to group cards by
study area (e.g. `"Canadian PPL"`, `"IFR"`, `"Botany"`). The importer creates the deck
automatically if it does not already exist.

**Legacy format (still supported)** — bare array of card objects:

```json
[
  { ...card },
  { ...card }
]
```

When the legacy format is used, the importer imports cards into the user's existing
default deck. The `--deck` CLI flag can override this. For new content always use the
wrapper format so the subject is explicit.

### Card object — all fields

```
{
  "id":          string        REQUIRED
  "topic":       string        REQUIRED
  "type":        string        REQUIRED  — "multiple_choice" | "open_answer"
  "difficulty":  string|null   REQUIRED  — "easy" | "medium" | "hard" | null
  "tags":        string[]      REQUIRED  — may be empty array []
  "question":    string        REQUIRED
  "choices":     Choice[]      MC ONLY   — absent (not null, not []) on open_answer cards
  "answer":      string        REQUIRED
  "explanation": string|null   REQUIRED  — null if unavailable
  "reference":   string|null   REQUIRED  — null if unavailable
  "media":       Media[]       OPTIONAL  — omit if no media; see below
}
```

### Choice object (multiple_choice only)

```
{
  "text":    string   REQUIRED — answer option text, plain prose
  "correct": boolean  REQUIRED — true if this is a correct answer, false otherwise
}
```

Key points:
- `correct` is **required on every choice** — no presence/absence trick.
- **Any number of choices** is valid (minimum 2). Do not add artificial limits.
- **Multiple choices can be correct** — use this for "select all that apply" questions.
- Choices have no letter labels. The app randomises order at display time.

### Media object

```
{
  "kind":        string   REQUIRED — "image" | "table" | "graph" | "video" | "pdf_excerpt" | "other"
  "role":        string   REQUIRED — "question_context" | "answer_explanation" | "reference"
  "src":         string   REQUIRED — URL or relative path (see below)
  "alt":         string   REQUIRED — plain-text description for accessibility and search
  "caption":     string   OPTIONAL — short display caption shown below the media
  "attribution": string   OPTIONAL — credit line for the attribution page (author, license, title)
  "origin":      string   OPTIONAL — where the asset was obtained; URL or bibliographic note
}
```

**`kind`** — what the media is:
- `"image"` — photograph, screenshot, diagram
- `"table"` — tabular data (can also be rendered as HTML/Markdown in `alt`)
- `"graph"` — chart or graph (e.g. pressure altitude chart, density altitude graph)
- `"video"` — short video clip
- `"pdf_excerpt"` — a page or section from a PDF document
- `"other"` — anything that doesn't fit the above

**`role`** — where the media appears in the card:
- `"question_context"` — displayed with the question, before the answer is revealed
- `"answer_explanation"` — displayed when the answer and explanation are shown
- `"reference"` — supplementary reference material (e.g. a chart page the question is based on)

**`src`** — where the media comes from:
- **External URL**: `"https://example.com/chart.png"` — fetched at display time, not stored in the app
- **Local file**: `"assets/metar-example.png"` — path relative to the JSON file's directory;
  the importer will record the path and Phase 7 will wire up actual file serving

When generating questions with an LLM and no real asset exists yet, set `src` to a
placeholder path (e.g. `"assets/TODO-chart-name.png"`) and describe the image clearly
in `alt`. The placeholder can be resolved when the actual asset is sourced.

**`attribution`** — the credit line to display on an attribution page. Include author,
license, and title where applicable. Examples:
- `"Transport Canada, Crown Copyright"` — government material, no licence fee
- `"Wikimedia Commons / Kogo, CC BY-SA 2.5"` — Creative Commons with author
- `"NAV CANADA, used with permission"` — permissioned material
- `"Own work"` — self-created

**`origin`** — where the asset was obtained, so it can be found again for review or
update. Can be a URL or a bibliographic note. Examples:
- `"https://commons.wikimedia.org/wiki/File:Cumulonimbus.jpg"`
- `"Transport Canada Flight Training Manual (TP1102E), p. 45, Figure 1-3"`
- `"NAV CANADA Aviation Weather Services Guide, Appendix B"`

---

## Field definitions

| Field | Required | Notes |
|-------|----------|-------|
| `id` | Yes | Unique per deck. Pattern: `PREFIX-NUMBER`, no leading zeros. |
| `topic` | Yes | Plain English. Consistent within a subject area. |
| `type` | Yes | `"multiple_choice"` or `"open_answer"`. |
| `difficulty` | Yes | `"easy"` = recall a fact; `"medium"` = apply a rule; `"hard"` = interpret or calculate. `null` for unknown. |
| `tags` | Yes | Lowercase kebab-case strings. Use `[]` if none. Aim for 2–5. |
| `question` | Yes | Plain prose. No Markdown, no bold, no HTML. Ends with `?`. |
| `choices` | MC only | Array of choice objects. Min 2. Any number correct. **Absent** on open_answer. |
| `answer` | Yes | MC: text summarising the correct answer(s). Open: model answer in 2–5 sentences. |
| `explanation` | Yes | Why the answer is correct. Cite rule number or principle. `null` if unavailable. |
| `reference` | Yes | Authoritative Canadian source with section/regulation. `null` if unavailable. |
| `media` | No | Array of media objects. Omit the field entirely if no media. |
| `media[].attribution` | No | Credit line for attribution page: author, license, title. |
| `media[].origin` | No | Where the asset was obtained — URL or bibliographic note. |

---

## Examples

### Multiple-choice card (single correct answer)

```json
{
  "id": "MET-126",
  "topic": "Meteorology - Canadian Weather Products",
  "type": "multiple_choice",
  "difficulty": "easy",
  "tags": ["nav-canada", "weather-services", "canadian-products"],
  "question": "Who is responsible for providing civil aviation weather services in Canadian domestic airspace?",
  "choices": [
    { "text": "Federal Aviation Administration", "correct": false },
    { "text": "NAV CANADA", "correct": true },
    { "text": "Transport Canada only", "correct": false },
    { "text": "Local flying clubs", "correct": false }
  ],
  "answer": "NAV CANADA",
  "explanation": "NAV CANADA provides civil air navigation services in Canada, including the aviation weather program. Much of the meteorological information originates from Environment and Climate Change Canada through service arrangements. The FAA has no jurisdiction in Canadian airspace.",
  "reference": "NAV CANADA Aviation Weather Services Guide, Introduction and Aviation Weather Services"
}
```

### Multiple-choice card (multiple correct answers)

```json
{
  "id": "MET-201",
  "topic": "Meteorology - Canadian Weather Products",
  "type": "multiple_choice",
  "difficulty": "medium",
  "tags": ["metar", "taf", "current-weather", "forecast-weather"],
  "question": "Which of the following are current weather observation reports (not forecasts)? Select all that apply.",
  "choices": [
    { "text": "METAR", "correct": true },
    { "text": "TAF", "correct": false },
    { "text": "SPECI", "correct": true },
    { "text": "GFA", "correct": false }
  ],
  "answer": "METAR and SPECI",
  "explanation": "METARs are routine hourly observations; SPECIs are special observations issued when conditions change significantly between routine reports. TAFs and GFAs are forecasts, not observations.",
  "reference": "NAV CANADA Aviation Weather Services Guide, Weather Observations"
}
```

### Open-answer card

```json
{
  "id": "MET-128",
  "topic": "Meteorology - Canadian Weather Products",
  "type": "open_answer",
  "difficulty": "easy",
  "tags": ["self-briefing", "fic", "pilot-briefing"],
  "question": "What is the difference between self-briefing with online Canadian aviation weather products and calling a Flight Information Centre (FIC) briefer?",
  "answer": "Self-briefing lets a pilot review products such as METARs, TAFs, GFAs, PIREPs, radar, satellite imagery, weather charts, and NOTAMs directly. Calling a FIC briefer adds professional interpretation of the weather situation, tailored to the planned route, timing, altitude, aircraft, and pilot questions. A good practice is to review the big picture first, then contact a briefer when the situation is complicated, marginal, or changing.",
  "explanation": "Self-briefing gives you raw data; a FIC briefer synthesizes it. The briefer can flag hazards you may have missed and is required for IFR flight plans in Canada. For VFR, self-briefing is legal but calling a briefer is strongly recommended in complex weather.",
  "reference": "NAV CANADA Aviation Weather Services Guide, Aviation Weather Web Site and Weather Briefing Tips"
}
```

### Card with media (external URL)

```json
{
  "id": "MET-350",
  "topic": "Meteorology - Weather Charts and Tools",
  "type": "multiple_choice",
  "difficulty": "medium",
  "tags": ["gfa", "cloud-forecast", "canadian-products"],
  "question": "Looking at the GFA clouds and weather panel shown, what cloud base and tops are forecast for the highlighted area?",
  "choices": [
    { "text": "Base 2000 ft AGL, tops 8000 ft ASL", "correct": false },
    { "text": "Base 3000 ft AGL, tops 12 000 ft ASL", "correct": true },
    { "text": "Base 1500 ft AGL, tops 6000 ft ASL", "correct": false }
  ],
  "answer": "Base 3000 ft AGL, tops 12 000 ft ASL",
  "explanation": "GFA cloud symbols show base AGL and tops ASL separated by a slash. The symbol in the highlighted area reads 30/120, which decodes as base 3000 ft AGL and tops 12 000 ft ASL.",
  "reference": "NAV CANADA Aviation Weather Services Guide, Graphical Area Forecast (GFA)",
  "media": [
    {
      "kind": "image",
      "role": "question_context",
      "src": "https://example.nav.canada.ca/gfa-sample.png",
      "alt": "GFA clouds and weather panel showing a frontal system over southern Ontario with cloud symbols",
      "caption": "GFA Clouds and Weather — valid 0000Z to 1200Z",
      "attribution": "NAV CANADA, used with permission",
      "origin": "https://www.navcanada.ca/en/aviation-weather-services.aspx"
    }
  ]
}
```

### Card with local media placeholder

```json
{
  "id": "NAV-045",
  "topic": "Navigation - VNC Charts",
  "type": "multiple_choice",
  "difficulty": "hard",
  "tags": ["vnc", "chart-reading", "airspace"],
  "question": "What type of airspace is depicted by the magenta circle on the chart excerpt shown?",
  "choices": [
    { "text": "Class C airspace", "correct": false },
    { "text": "Class D airspace", "correct": false },
    { "text": "Military Terminal Control Area", "correct": false },
    { "text": "Class F Restricted airspace", "correct": true }
  ],
  "answer": "Class F Restricted airspace",
  "explanation": "Class F Restricted airspace is shown on VNC charts as a magenta circle with an R designator. Entry requires prior permission from the controlling authority. It differs from Prohibited airspace (shown in red) where entry is never permitted.",
  "reference": "Transport Canada AIM, RAC 2.8 — Special Use Airspace; VNC legend",
  "media": [
    {
      "kind": "image",
      "role": "question_context",
      "src": "assets/TODO-vnc-class-f-excerpt.png",
      "alt": "VNC chart excerpt showing a magenta circle with an R designator near a populated area",
      "attribution": "Transport Canada, Crown Copyright",
      "origin": "VNC chart — Vancouver 1:500 000, edition 2024"
    }
  ]
}
```

### Migrated card with null fields

```json
{
  "id": "Q001",
  "topic": "Air Law - Collision Avoidance",
  "type": "multiple_choice",
  "difficulty": null,
  "tags": [],
  "question": "When two aircraft are converging at approximately the same altitude, which aircraft must give way?",
  "choices": [
    { "text": "The aircraft on the left", "correct": false },
    { "text": "The aircraft that has the other on its right", "correct": true },
    { "text": "The faster aircraft", "correct": false },
    { "text": "The higher aircraft", "correct": false }
  ],
  "answer": "The aircraft that has the other on its right",
  "explanation": "Under CAR 602.19, when two aircraft are converging at approximately the same altitude, the aircraft that has the other on its right must give way.",
  "reference": "CAR 602.19; TP 11919 PSTAR S.1"
}
```

---

## Quick-start LLM prompt

Copy this block and fill in the placeholders at the bottom:

```
You are writing flashcard questions for a Canadian Private Pilot Licence (PPL) ground
school study app. Output a JSON array of question objects. Follow the format and rules
below exactly.

--- FORMAT ---

A question file is a plain JSON array. Each element is a card object:

{
  "id":          string        — unique ID, pattern PREFIX-NUMBER, e.g. "MET-600"
  "topic":       string        — subject area, e.g. "Meteorology - Icing"
  "type":        "multiple_choice" | "open_answer"
  "difficulty":  "easy" | "medium" | "hard"
  "tags":        string[]      — 2–5 lowercase kebab-case tags
  "question":    string        — plain prose, no markdown, ends with ?
  "choices":     Choice[]      — multiple_choice only; absent on open_answer
  "answer":      string        — for MC: text of correct answer(s); for open: 2–5 sentence answer
  "explanation": string        — why the answer is correct; cite rule/section/principle
  "reference":   string        — authoritative Canadian source with section/regulation
  "media":       Media[]       — optional; omit if no media needed
}

Choice object:
{
  "text":    string   — option text, plain prose
  "correct": boolean  — true if correct, false otherwise; required on every choice
}

Media object:
{
  "kind":    "image" | "table" | "graph" | "video" | "pdf_excerpt" | "other"
  "role":    "question_context" | "answer_explanation" | "reference"
  "src":     string   — external URL, or "assets/TODO-filename.ext" for placeholders
  "alt":     string   — plain-text description of the media
  "caption": string   — optional short caption
}

--- RULES ---

1. Choices have no letter labels. Use any number of choices (minimum 2). Any number can
   be correct — use multiple correct choices for "select all that apply" questions.
2. "correct" is required on every choice object — do not omit it on wrong choices.
3. For multiple_choice, "answer" should be the text of the correct choice, or a short
   summary if multiple choices are correct (e.g. "METAR and SPECI").
4. Wrong choices must be plausible — no obviously silly distractors.
5. The explanation must add information beyond restating the answer. Cite rule numbers,
   regulations, or the underlying aeronautical principle.
6. The reference must name a real Canadian source:
   - Transport Canada Flight Training Manual (TP1102E)
   - Canadian Aviation Regulations (CARs) — cite the specific regulation, e.g. CAR 602.19
   - AIM — Aeronautical Information Manual (TP14371)
   - NAV CANADA Aviation Weather Services Guide
   - Transport Canada Weather for Pilots (TP7991)
   - PSTAR study guide (TP11919)
7. "difficulty": "easy" = recall a fact; "medium" = apply a rule; "hard" = interpret data
   or reason across multiple concepts.
8. IDs follow PREFIX-NUMBER (no leading zeros). Use the prefix and starting number I give.
9. Tags are lowercase, hyphen-separated, and specific (e.g. "vfr-weather-minima" not "weather").
10. If a question refers to a chart or image, add a media object with kind "image" or "graph",
    role "question_context", src set to a descriptive placeholder like
    "assets/TODO-chart-description.png", and a thorough alt description of what the image
    should show.
11. Output the result as a wrapper object: {"subject": "[SUBJECT]", "cards": [...]}
    No explanation text, no markdown fences, no preamble outside the JSON.

--- END FORMAT ---

Generate [NUMBER] questions on the topic: [YOUR TOPIC HERE].
Use prefix [PREFIX] and start IDs at [PREFIX-NUMBER].
Subject label: [SUBJECT — e.g. "Canadian PPL", "IFR", "Botany"]
```

---

## ID prefixes and ranges

### In use

| Prefix | Topic area | Used range |
|--------|------------|------------|
| `MET` | Meteorology | 126–620 |
| `Q` | Air Law (legacy, PSTAR focus) | 001–300 (estimated) |

Start new IDs after the highest used number in a prefix, or use a new prefix for a
new subject area.

### Suggested prefixes for new content

| Prefix | Topic area |
|--------|------------|
| `AIRLAW` | Air law (new structured series, replaces `Q`) |
| `AERO` | Aerodynamics and aircraft performance |
| `NAV` | Navigation |
| `RADIO` | Radiotelephony and communication |
| `WX` | Weather theory (not Canadian-product-specific) |
| `POH` | Aircraft systems and POH knowledge |
| `HUMAN` | Human factors |

---

## Importing questions

Save the JSON array to a file and run:

```bash
docker compose exec app npx tsx scripts/import.ts path/to/questions.json --dry-run
```

Review the output for validation warnings (missing difficulty, missing reference, null
fields), then run without `--dry-run` to import.
