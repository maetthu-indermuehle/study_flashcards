# Project Status

This document is a living snapshot of where the project stands and what comes next.
Update it when a phase is completed or when plans change.

Last updated: 2026-05-17

---

## Current state

**Phase 2 is in progress.** Working on branch `phase-2-json-importer`.

The JSON format spec is finalised, the parser (21 tests), validator (19 tests),
import service, and CLI script are all implemented. The next step is a smoke test
with a hand-written JSON file to confirm the full pipeline works against the database.

---

## Completed phases

### Phase 0 — Project setup

- Next.js 16 App Router with TypeScript and Tailwind CSS.
- Prisma 7 installed and configured with the `prisma-client` generator.
- Docker Compose with app and PostgreSQL services.
- OpenShift-compatible production Dockerfile (non-root, standalone output, configurable PORT).
- Health endpoint at `/api/health`.
- Environment variable validation with Zod (`src/lib/env/`).
- Linting (ESLint), formatting (Prettier), and unit test baseline (Node built-in test runner + tsx).

### Phase 1 — Database and core models

- Full Prisma schema: 13 models, 11 enums covering users, decks, cards, choices, tags,
  reviews, spaced-repetition progress, study sessions, import batches, and media assets.
- Initial database migration (`prisma/migrations/20260516202544_init`).
- Seed script: creates `admin@local.dev` user and a "Canadian PPL" deck. Credentials
  come from environment variables; the script is idempotent.
- Prisma DB client singleton with the `@prisma/adapter-pg` driver adapter required by
  Prisma 7 (`src/lib/db/client.ts`).
- GitHub Actions CI workflow (`.github/workflows/ci.yml`): lint + typecheck + tests on
  Node 24, plus production image build with GHA layer cache.
- Fixed Turbopack panic in Docker named-volume setup by switching to `--webpack`.

---

## Phase 2 — JSON importer (in progress)

**Goal:** Define a canonical JSON question format and build the import pipeline. The app
only ever reads JSON. A one-off migration script converts the existing Markdown files to
JSON; the output is committed to the repo.

See [docs/phase_2_plan.md](phase_2_plan.md) for the full implementation plan and build
order. See [docs/question_generation_guide.md](question_generation_guide.md) for the
JSON format spec and LLM prompt.

### Task progress

- [x] Finalise JSON format spec (`docs/question_generation_guide.md`)
- [x] JSON parser + tests (`app/src/lib/importer/json-parser.ts`, 21 tests passing)
- [x] Validator + tests (`app/src/lib/importer/validator.ts`, 19 tests passing)
- [x] Import service (`app/src/lib/importer/import-service.ts`)
- [x] CLI script (`app/scripts/import.ts`)
- [ ] Smoke test with hand-written JSON cards
- [ ] Migration script (`scripts/md_to_json.ts`) — converts `Questions/*.md` → `data/questions/*.json`
- [ ] Full import of all migrated files
- [ ] Update page badge to Phase 2

---

## Phases ahead (summary)

| Phase | Name                       | What it unlocks                                                    |
|-------|----------------------------|--------------------------------------------------------------------|
| 3     | Minimal authentication     | Local credentials login, session handling, auth guards, user-scoped progress |
| 4     | First study experience     | Mobile flashcard loop: multiple-choice and open-answer, reveal, explanation, reference |
| 5     | Spaced repetition v1       | SM-2-inspired scheduler, due-card selection, review statistics     |
| 6     | Card management UI         | Browse, search, filter, create, edit, archive cards in the app     |
| 7     | Media support v1           | Images, charts, and diagrams on question/answer sides              |
| 8     | Bulk import UI             | JSON upload inside the app, with preview and validation            |
| 9     | PWA and mobile polish      | Installable app, offline-ready, polished touch UX                  |
| 10    | OpenShift deployment       | Helm chart, migration Job, production environment docs             |
| 11    | Export and backup tools    | JSON, CSV export so content stays portable                         |
| 12    | Improvements after daily use | Stats, exam-readiness, FSRS, AI-assisted card creation, offline sync |

---

## First milestone (definition of done for core v1)

> Run locally with Docker, import existing questions into PostgreSQL, log in as the seed
> user, and study random/due cards on a phone-friendly UI.

This milestone is reached after Phase 4. Phases 0–1 are done; Phases 2–4 remain.

---

## Active technical decisions

- **JSON-only app import** — the app importer only reads JSON (the format defined in
  `docs/question_generation_guide.md`). The one-off script `scripts/md_to_json.ts`
  converts the existing Markdown files; after that, all new questions are authored in JSON.
- **Webpack over Turbopack in dev** — Turbopack panics with "Next.js package not found"
  in the named Docker volume setup. Using `next dev --webpack` until this is resolved
  upstream.
- **Prisma 7 driver adapter** — `prisma-client` generator requires an explicit
  `@prisma/adapter-pg` + `pg` adapter; there is no embedded Rust query engine.
- **Seed credentials from env** — `SEED_USER_EMAIL` and `SEED_USER_PASSWORD` are set in
  `docker-compose.yml` for local dev (`admin@local.dev` / `localdev`). The password is
  hashed with `crypto.scrypt` using the format `<hash>.<salt>`.
- **Test runner** — Node built-in `node:test` + `tsx` loader. No Jest or Vitest.
- **Multiple correct choices** — the JSON format and `Choice` model both support multiple
  `isCorrect: true` choices per card, enabling "select all that apply" questions.
