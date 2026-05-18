# Project Status

This document is a living snapshot of where the project stands and what comes next.
Update it when a phase is completed or when plans change.

Last updated: 2026-05-18

---

## Current state

**Phase 7 is complete.** Working on branch `phase-7-user-management`.

The app now has full multi-user support with three roles (USER / EDITOR / ADMIN),
brute-force login protection, session invalidation via `passwordVersion`, an admin UI
for user management, a profile page for password changes, and an append-only audit log.
150 unit tests pass.

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

### Phase 2 — JSON importer

- Canonical JSON question format spec (`docs/question_generation_guide.md`) with LLM prompt.
- Full import pipeline: Zod parser → semantic validator → import service (upsert by
  `(deckId, originalId)`, idempotent).
- CLI script (`app/scripts/import.ts`) with `--dry-run`, `--force`, `--verbose` flags.
- One-off Markdown → JSON migration script (`scripts/md_to_json.ts`), 923 cards from
  17 source files, 0 warnings.
- All migrated cards committed as `data/questions/*.json` — the portable source of truth.
- Seed script auto-imports all `*.json` files from `$QUESTIONS_DIR` on every container start.
- 926 cards in PostgreSQL (660 MC, 266 open answer, 2640 choices, 902 source references,
  642 tags).

### Phase 3 — Minimal authentication

- Stateless signed session cookie: HMAC-SHA256 over base64url JSON payload, 7-day lifetime,
  verified with constant-time comparison. No external auth libraries — Node.js `crypto` only.
- `src/lib/session/codec.ts` — `signSession` / `verifySession`.
- `src/lib/session/cookies.ts` — `createSessionCookie` / `readSessionCookie` /
  `clearSessionCookie` via `next/headers`.
- `src/lib/auth/password.ts` — `verifyPassword` matching the seed's `crypto.scrypt` format.
- `src/proxy.ts` — optimistic auth guard (Next.js 16 proxy); unauthenticated requests
  redirect to `/login`; authenticated users on `/login` redirect to `/`.
- `POST /api/auth/login` — verifies credentials, sets session cookie.
- `POST /api/auth/logout` — clears session cookie.
- `/login` page with email + password form (Server Component + Client form).
- Home page requires authentication; shows logged-in email and a Sign out button.
- `SESSION_SECRET` env var added (min 32 chars); set in `docker-compose.yml` for local dev.
- 65 tests passing across all modules.

### Phase 4 — Study flow

- `src/lib/study/types.ts` — `StudyCard` discriminated union (`MultipleChoiceCard | OpenAnswerCard`).
- `src/lib/study/get-random-card.ts` — random card fetch with Fisher-Yates choice shuffle.
- `/study` page — Server Component; fetches card, renders `<StudyShell key={card.id}>`.
- `StudyShell`, `MultipleChoiceCard`, `OpenAnswerCard`, `CardFeedback` — client component
  state machine (`idle → answered/revealed`).
- Loading skeleton and error boundary for the study route.
- 11 new unit tests (76 total).

### Phase 5 — Spaced repetition v1

- `src/lib/study/sm2.ts` — `computeNextProgress(current, rating, now?)` pure SM-2 function.
  WRONG resurfaces in 10 minutes (relearning step, same session). HARD resets to 1 day.
  GOOD/EASY advance with standard ease curve (min ease 1.3). 17 unit tests.
- `src/lib/study/get-next-card.ts` — `getNextCard(userId)`: due cards first, then unseen
  cards (random), then next-upcoming. Also `getDueCount(userId)` for the home page badge.
- `POST /api/study/review` — records `Review` row + upserts `CardProgress` in one
  transaction. Body: `{ cardId, rating, responseMs? }`.
- `CardFeedback` updated with Wrong/Hard/Good/Easy rating buttons replacing plain Next.
- Home page shows "X due" badge next to "Start studying →".
- 93 unit tests total.

### Phase 5 additions (post-merge patches)

- **Source ID label** — each card shows its `originalId` (e.g. `MET-042`) in small
  monospace text for easy issue reporting.
- **Flag button + notes** — flag icon on every card toggles a persistent "flagged" marker
  stored as a custom tag (no migration for the flag itself). An inline amber panel lets
  the user attach a free-text note explaining what is wrong. Note stored in `CardTag.note`
  (migration `20260517071643_add_card_tag_note`). `POST /api/study/flag` handles toggle
  and note upsert.
- **Question images** — 30 PNG assets copied to `app/public/assets/`. `QuestionText`
  component parses the Markdown image syntax embedded in question text
  (`![alt](assets/FILENAME.png) body`) and renders the image above the question.

### Phase 7 — User management

- Three roles: `USER` (study, flag, change own password), `EDITOR` (+ card create/edit/import),
  `ADMIN` (+ manage users).
- `Role` enum and `User.role` / `User.passwordVersion` fields (Prisma migration).
- `LoginAttempt` model: 10 failures in 15 min locks the account. Email-based (not
  userId) to prevent user enumeration via differential lock-out timing.
- `AdminEvent` model: append-only audit log for all admin actions.
- `src/lib/auth/permissions.ts` — `hasRole()` + `requireRole(minRole)` (verifies
  `passwordVersion` against DB to reject stale sessions).
- `src/lib/auth/brute-force.ts` — lock check and attempt recording.
- `hashPassword()` centralised in `password.ts`; `MIN_PASSWORD_LENGTH = 10`.
- Session cookie gains `role` and `passwordVersion`.
- Proxy updated with role-based route guards (optimistic; no DB query).
- Login route: brute-force gate before credential lookup.
- Admin UI: `/admin/users` list → create → edit (role + display name) → reset
  password → delete. Guards: can't delete self, can't remove last admin.
- `/profile` — change-own-password (requires current password; increments
  `passwordVersion` to invalidate other sessions).
- Home page: Profile link + Admin badge for ADMIN users.
- 21 new tests (150 total).

### Phase 9 — PWA and mobile polish

- Web App Manifest (`manifest.ts`): `standalone` display, portrait, theme colour
  `#0f172a`, 192×192 and 512×512 PNG icons.
- Generated icons via Next.js `ImageResponse`: `icon.tsx` (32×32 favicon),
  `apple-icon.tsx` (180×180 iOS touch icon).
- Service worker (`public/sw.js`): cache-first for JS/CSS/images, network-first for
  navigation. Enables install prompt on HTTPS/localhost.
- `ServiceWorkerRegistration` client component in root layout.
- `globals.css`: tap-highlight removal, `touch-action: manipulation`, safe-area
  utilities, `overscroll-behavior-y: contain`.
- Study page and home page padded for iPhone home-indicator safe area.
- Rating buttons bumped to ≥44 px touch target (Apple HIG minimum).

### Phase 6 — Card management UI

- Card browser at `/cards`: paginated list with search (full-text), filters (type,
  difficulty, status, tag, flaggedOnly), and sort. URL search params drive all filters
  so results are bookmarkable.
- Card detail/edit page at `/cards/[id]`: full edit form with question, answer,
  explanation, choices (MC), tags, difficulty, status, and source reference.
- New card form at `/cards/new`.
- Flagged review queue at `/cards/flagged`: step-through mode with "Save & clear flag",
  "Save & keep flagged", and "Skip" actions.
- `CardRevision` model: append-only edit history, one JSON snapshot written before every
  save. History browsing/restore UI deferred to a later phase.
- `CardBrowser`, `CardForm`, `ChoiceEditor`, `TagSelector`, `FlaggedQueue` components.
- "Browse cards" button on the home page; "Edit" link in the study card toolbar.
- 36 new unit tests (129 total).

---

## Phases ahead (summary)

| Phase | Name                       | What it unlocks                                                    |
|-------|----------------------------|--------------------------------------------------------------------|
| 7     | Media support v1           | Media upload UI and object storage for new cards                   |
| 8     | Bulk import UI             | JSON upload inside the app, with preview and validation            |
| 9     | PWA and mobile polish      | Installable app, offline-ready, polished touch UX                  |
| 10    | OpenShift deployment       | Helm chart, migration Job, production environment docs             |
| 11    | Export and backup tools    | JSON, CSV export so content stays portable                         |
| 12    | Improvements after daily use | Stats, exam-readiness, FSRS, AI-assisted card creation, offline sync |

---

## First milestone (definition of done for core v1)

> Run locally with Docker, import existing questions into PostgreSQL, log in as the seed
> user, and study random/due cards on a phone-friendly UI.

**This milestone is complete.** Phases 0–5 are done and merged to `main`.

---

## Deployment / data portability

Questions are the portable artefact. The JSON files in `data/questions/` are committed
to the repository. The seed script (`app/prisma/seed.ts`) runs the full import pipeline
against every file in that directory on every container startup. Any new deployment
(local, CI, OpenShift) runs `docker compose up` and gets all cards automatically.

The seed is idempotent: re-running updates existing cards in place and does not create
duplicates. A missing `data/questions/` directory is skipped silently so CI is unaffected.

---

## Active technical decisions

- **JSON-only app import** — the app importer only reads JSON (the format defined in
  `docs/question_generation_guide.md`). The one-off script `scripts/md_to_json.ts`
  converts the existing Markdown files; after that, all new questions are authored in JSON.
- **Stateless session cookie** — HMAC-SHA256 signed cookie, no DB session table. The
  `SESSION_SECRET` env var must be at least 32 characters. In production, generate with
  `openssl rand -base64 32`.
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
- **Proxy (not middleware)** — Next.js 16 renames `middleware.ts` to `proxy.ts`; the
  exported function must be named `proxy`. Functionality is identical to middleware in
  earlier versions.
- **Question images as static assets** — 30 PNG files committed to `app/public/assets/`
  and served by Next.js. Images are referenced inline in question text using Markdown
  syntax (`![alt](assets/FILENAME.png)`); `QuestionText` parses and renders them. Full
  Phase 7 media management (object storage, upload UI) is deferred.
- **Flags stored as custom tags** — the "flagged" marker uses the existing `Tag`/`CardTag`
  tables (`{ name: "flagged", type: CUSTOM }`) rather than a dedicated column, avoiding a
  schema migration for the flag itself. The note field (`CardTag.note`) required one
  nullable-column migration.
