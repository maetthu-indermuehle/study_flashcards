# Project Status

This document is a living snapshot of where the project stands and what comes next.
Update it when a phase is completed or when plans change.

Last updated: 2026-05-16

---

## Current state

**Phase 1 is complete.** The branch `phase-1-database-models` is open and ready to be
merged to `main`.

The app boots locally with Docker Compose, connects to PostgreSQL, runs migrations on
startup, seeds a default user and deck, and serves the Next.js dev server on
http://localhost:3000.

GitHub Actions CI runs on every push: lint, typecheck, unit tests, and a production
Docker image build.

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

## Immediate next step: Phase 2 — JSON importer

**Goal:** Define a canonical JSON question format and build the import pipeline.
The app only ever reads JSON. A one-off migration script converts the existing
Markdown files to JSON; the output is committed to the repo.

Key tasks:

1. Write `scripts/md_to_json.ts` (repo root) — one-off conversion of all Markdown files
   in `Questions/` to JSON in `data/questions/`. Run once, commit, done.
2. Build the app JSON parser (`app/src/lib/importer/json-parser.ts`) against the format
   defined in `docs/question_generation_guide.md`.
3. Add validation (missing answer, no correct choice, missing reference, duplicate IDs).
4. CLI import command: `npx tsx scripts/import.ts <file.json> [--dry-run]`.
5. Store import metadata in the `ImportBatch` model.

Deliverable: existing questions live in `data/questions/*.json`, importable into
PostgreSQL. All future questions (hand-written or LLM-generated) use the same JSON format.

---

## Phases ahead (summary)

| Phase | Name                       | What it unlocks                                                    |
|-------|----------------------------|--------------------------------------------------------------------|
| 3     | Minimal authentication     | Local credentials login, session handling, auth guards, user-scoped progress |
| 4     | First study experience     | Mobile flashcard loop: multiple-choice and open-answer, reveal, explanation, reference |
| 5     | Spaced repetition v1       | SM-2-inspired scheduler, due-card selection, review statistics     |
| 6     | Card management UI         | Browse, search, filter, create, edit, archive cards in the app     |
| 7     | Media support v1           | Images, charts, and diagrams on question/answer sides              |
| 8     | Bulk import UI             | Markdown upload or paste inside the app, with preview and validation |
| 9     | PWA and mobile polish      | Installable app, offline-ready, polished touch UX                  |
| 10    | OpenShift deployment       | Helm chart, migration Job, production environment docs             |
| 11    | Export and backup tools    | Markdown, JSON, CSV export so content stays portable               |
| 12    | Improvements after daily use | Stats, exam-readiness, FSRS, AI-assisted card creation, offline sync |

---

## First milestone (definition of done for core v1)

> Run locally with Docker, import existing Markdown cards into PostgreSQL, log in as the
> seed user, and study random/due cards on a phone-friendly UI.

This milestone is reached after Phase 4. Phases 0–1 are done; Phases 2–4 remain.

---

## Active technical decisions

- **Webpack over Turbopack in dev** — Turbopack panics with "Next.js package not found"
  in the named Docker volume setup. Using `next dev --webpack` until this is resolved
  upstream.
- **Prisma 7 driver adapter** — `prisma-client` generator requires an explicit
  `@prisma/adapter-pg` + `pg` adapter; there is no embedded Rust query engine.
- **Seed credentials from env** — `SEED_USER_EMAIL` and `SEED_USER_PASSWORD` are set in
  `docker-compose.yml` for local dev (`admin@local.dev` / `localdev`). The password is
  hashed with `crypto.scrypt` using the format `<hash>.<salt>`.
- **Test runner** — Node built-in `node:test` + `tsx` loader. No Jest or Vitest.
