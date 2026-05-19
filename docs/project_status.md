# Project Status

This document is a living snapshot of where the project stands and what comes next.
Update it when a phase is completed or when plans change.

Last updated: 2026-05-19

---

## Current state

**Phase 12 (OpenShift deployment) is complete.** The app is live at
[flashcards.maetthu.com](https://flashcards.maetthu.com). Working on branch
`phase-11-export` (OpenShift work was done ahead of the export phase at the user's
request).

Phases 0–12 are complete and merged to `main`.

Phase 12 completed work (in this branch, ahead of schedule):

- Helm chart (`deploy/helm/`) with Deployment + migration init container, Service,
  Kubernetes Ingress (cert-manager Let's Encrypt), optional PostgreSQL StatefulSet
  (`postgres.enabled`, default true), Secrets, seed Job.
- `postgres.enabled=false` path: external `DATABASE_URL` is supplied (e.g. from VSHN
  AppCat PostgreSQL); all built-in postgres resources are skipped.
- `Dockerfile.tools` at repo root: builds the tools image with full question bank access
  (`data/questions/` is at repo root, outside `./app` build context).
- CI `publish` job: builds and pushes `:latest` (runner) and `:tools` images to ghcr.io on
  every merge to `main`.
- CD `deploy` workflow (in `metar_display-appuio` repo): provisions VSHN AppCat PostgreSQL,
  waits for readiness, reads connection string, and deploys via `helm upgrade --install`.
- `deploy/README.md` setup guide.
- PSTAR question bank: 192 questions (TP11919 7th edition) added to `data/questions/pstar.json`.

**Deployment status:** live and running at flashcards.maetthu.com with Let's Encrypt TLS,
VSHN AppCat PostgreSQL on APPUiO cloudscale-lpg-2, and full question bank seeded.

Phase 10 completed work:

- Repository cleanup: removed all converted Markdown source files and PNG question images
  now superseded by `data/questions/*.json`.
- Study setup page (`/study/setup`): two-level topic/tag accordion, saved presets with
  sharing, "review due only" mode, card ID tooltip showing topics and tags.
- Multi-subject support: JSON files can carry a `subject` wrapper; each subject maps to
  a named deck (auto-created on import). Study setup shows a subject header per deck.
- Direct launch: home page (`/`) redirects straight back into the last study session via
  a `lastStudy` cookie; first-time users see a `/welcome` placeholder.
- `HamburgerMenu` right-side slide-in drawer on every authenticated page, replacing the
  previous `← Home` back links. Role-aware sections (Study / Content / Admin / Account).
- FlaggedQueue single-click save: "Save & clear flag" and "Save & keep flagged" save and
  advance in one click via an imperative `CardForm` ref handle.
- Fixed `node:crypto` webpack error on the Profile page by extracting `MIN_PASSWORD_LENGTH`
  to `lib/auth/constants.ts` so the client bundle no longer pulls in Node crypto modules.
- 168 unit tests pass.

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

### Phase 8 — Bulk import UI

- Three-step import wizard at `/import` (EDITOR+ only): upload JSON file or paste raw
  JSON → dry-run preview (create/update counts, hard errors, warnings, first-10 sample)
  → confirm import.
- `dryRunImport` server action: parse + validate + DB check for existing source IDs,
  no writes. Returns preview data including target deck name.
- `runImport` server action: full pipeline write; stores raw JSON in `ImportBatch` for audit.
- `getImportHistory` server action: last 10 `ImportBatch` rows for the current user.
- Pure helpers (`partitionCounts`, `buildSample`) extracted and tested (11 new tests,
  161 total).
- Proxy updated: `/import` requires EDITOR role.
- Home page: Import cards button for EDITOR+ users.
- Recent import history shown below the wizard.

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

### Phase 10 — Cleanup and UI improvements (in progress)

- Removed 17 converted Markdown source files and 30 PNG question images from `Questions/`
  — superseded by `data/questions/*.json`.
- Updated `docs/app_architecture_plan.md`, `docs/core_domain_model.md`,
  `docs/implementation_plan.md`, and `docs/project_status.md` to reflect current state.
- **Study setup page** (`/study/setup`):
  - Topic accordion: group header selects all tags in the group; expand to pick sub-topics.
    Indeterminate checkbox state for partial group selection.
  - Saved presets: save a named tag selection, reload in one click. EDITOR+ can mark
    presets as shared (visible to all users).
  - Due-count badge: "Review due (N) →" button appears when due cards exist for the
    current selection; calls `getDueCountForSelection` server action reactively.
  - Tag filter preserved across cards (`useSearchParams` in `StudyShell`).
  - `dueOnly=1` URL mode: study only due cards; "All caught up!" screen when exhausted.
  - Back link returns to setup when a tag filter is active.
- **Card ID tooltip** (`CardIdBadge`): click the source ID to see a bubble listing topics
  and tags for that card. No visual change to the ID itself.
- **Multi-subject support**:
  - JSON files support `{"subject": "...", "cards": [...]}` wrapper; `subject` becomes
    the deck name (auto-created by `importCards` on first import). Legacy bare-array
    format is still accepted.
  - `parseJsonBatch()` handles both formats; `parseJsonCards()` is a backward-compat alias.
  - `import-service.ts` does `findOrCreate` on the deck.
  - `dryRunImport` / `runImport` return `deckName` in results; preview and done screens
    display it.
  - `StudySetup` three-level accordion: subject (deck) → topic group → sub-topic.
    Subject row is always visible; auto-expanded when only one deck exists.
  - `getNextCard` and `getDueCount` search across all user decks.
  - CLI uses `subject` from JSON when present; `--deck` is the fallback.
  - `question_generation_guide.md` updated with new format and LLM prompt.
  - `StudyPreset` model added (migration `20260518175549_add_study_presets`).
  - 7 new unit tests for `parseJsonBatch` — 168 tests total.
- **Direct launch + hamburger nav** (v0.10.2):
  - Home page is a pure redirect; `lastStudy` cookie (30-day, written by proxy) stores
    the last tag selection for instant re-entry.
  - `/welcome` placeholder page for first-time users.
  - `HamburgerMenu` client component: right-side slide-in drawer with role-aware sections.
    Replaces `← Home` links on all authenticated pages.
  - `← Setup` back link always visible on the study page.
- **UI consistency + bug fixes** (v0.10.3):
  - Hamburger menu added to all remaining authenticated pages: `/cards`, `/cards/[id]`,
    `/cards/flagged`, `/cards/new`, `/import`, `/admin/*` layout, `/profile`.
  - FlaggedQueue: `CardForm` converted to `forwardRef` + `hideActions` prop; action
    buttons now trigger save imperatively — no separate "Save changes" click required.
  - `MIN_PASSWORD_LENGTH` extracted to `lib/auth/constants.ts`; fixes webpack
    `node:crypto` error when navigating to `/profile`.

---

## Phases ahead (summary)

| Phase | Name                         | What it unlocks                                                    |
|-------|------------------------------|--------------------------------------------------------------------|
| 11    | Export and backup tools      | JSON/CSV export so content is portable before production deploy    |
| 12    | OpenShift deployment         | Helm chart, migration Job, production environment docs             |
| 13    | Media support v1             | Media upload UI and object storage for new cards                   |
| 14    | Improvements after daily use | Stats, exam-readiness, FSRS, AI-assisted card creation, offline sync |

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
  converted the existing Markdown files; after that, all new questions are authored in JSON.
- **Multi-subject JSON format** — new files use `{"subject": "...", "cards": [...]}`.
  The importer creates the deck automatically. Legacy bare arrays are still accepted and
  import into the user's first deck (or the `--deck` CLI flag).
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
