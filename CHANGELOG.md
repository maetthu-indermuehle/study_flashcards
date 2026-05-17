# Changelog

All notable changes to this project will be documented in this file.

This project uses semantic versioning. Every push increments the patch version;
completing a phase increments the minor version and resets the patch to 0.

## [Unreleased]

---

## [0.6.1] - 2026-05-17

### Added

- **Source ID label** — each card now shows its original source ID (e.g. `MET-042`)
  in small monospace text above the question, making it easy to reference a specific
  card when reporting a problem.
- **Flag button** — a flag icon in the top-right of every card toggles a "flagged"
  marker. Flagged cards are highlighted in amber and persist across sessions. Stored
  as a `flagged` custom tag via the existing `Tag`/`CardTag` tables — no migration
  required. `POST /api/study/flag` handles the toggle.

---

## [0.6.0] - 2026-05-17

### Added

- `app/src/lib/study/sm2.ts` — `computeNextProgress(current, rating, now?)` pure SM-2
  scheduler. Maps WRONG→0, HARD→2, GOOD→4, EASY→5 quality scores. WRONG resurfaces the
  card in 10 minutes (relearning step) rather than the next day so it can come back within
  the same session. HARD resets to 1 day. GOOD/EASY advance with the standard SM-2 ease
  factor curve (min ease 1.3). 17 unit tests.
- `app/src/lib/study/get-next-card.ts` — `getNextCard(userId)` replaces `getRandomCard`.
  Priority: (1) overdue card soonest-first, (2) unseen card random, (3) next-upcoming
  card when studying ahead of schedule. Also exports `getDueCount(userId)` used on the
  home page.
- `app/src/app/api/study/review/route.ts` — `POST /api/study/review`. Reads session
  cookie, validates `{ cardId, rating, responseMs? }`, runs SM-2, writes a `Review` row
  and upserts `CardProgress` in one transaction.
- Home page now shows a "X due" badge next to "Start studying →" when cards are overdue.

### Changed

- `app/src/features/study/CardFeedback.tsx` — replaced the single "Next card →" button
  with four rating buttons: Wrong (red), Hard (orange), Good (green), Easy (blue). Clicking
  a button POSTs to `/api/study/review` then navigates to the next card. Buttons are
  disabled during the in-flight request.
- `app/src/features/study/MultipleChoiceCard.tsx` and `OpenAnswerCard.tsx` — accept and
  forward `cardId` prop to `CardFeedback`.
- `app/src/features/study/StudyShell.tsx` — passes `card.id` as `cardId` to both card
  components.
- `app/src/app/study/page.tsx` — uses `getNextCard` instead of `getRandomCard`.
- 17 new unit tests for the SM-2 scheduler (93 total).

---

## [0.5.2] - 2026-05-17

### Fixed

- `app/src/lib/env/server.ts` — replaced eager `serverEnvSchema.parse()` at
  module load time with a lazy Proxy. `next build` evaluates route modules to
  collect page data but `DATABASE_URL` and `SESSION_SECRET` are not present in
  the Docker builder stage (they are runtime secrets). The eager parse caused a
  `ZodError` that failed the production Docker image build. The Proxy defers
  parsing until the first property access (request time), so the image builds
  cleanly while still failing fast on a misconfigured runtime environment.

---

## [0.5.1] - 2026-05-17

### Fixed

- `app/src/lib/importer/import-service.ts` — set `status: "PUBLISHED"` on all
  created and updated cards so they are immediately available for study. Previously
  cards defaulted to `DRAFT` (the Prisma schema default), causing the study route
  to return "No cards available".

---

## [0.5.0] - 2026-05-17

### Added

- `app/src/lib/study/types.ts` — `StudyCard` discriminated union (`MultipleChoiceCard |
  OpenAnswerCard`), `StudyCardChoice`, `StudyCardReference` types.
- `app/src/lib/study/get-random-card.ts` — `getRandomCard(userId)` fetches one random
  published card from the user's deck via a two-query strategy (all IDs → random pick →
  full fetch with choices and source reference). Choices are Fisher-Yates shuffled before
  returning. Pure helpers `shuffleArray` and `mapRawCardToStudyCard` are exported for
  unit testing.
- `app/src/app/study/page.tsx` — Server Component; reads session, calls `getRandomCard`,
  passes card to `<StudyShell key={card.id}>`. The `key` prop ensures state resets on
  every new card.
- `app/src/app/study/loading.tsx` — animated skeleton shown while the RSC payload for
  the next card loads.
- `app/src/app/study/error.tsx` — error boundary with retry button.
- `app/src/features/study/StudyShell.tsx` — Client Component owning the state machine
  (`idle → answered | revealed`). Calls `router.push('/study', { scroll: false })` for
  "Next", triggering a fresh RSC render.
- `app/src/features/study/MultipleChoiceCard.tsx` — choice buttons with correct (green)
  / incorrect (red) inline feedback after selection.
- `app/src/features/study/OpenAnswerCard.tsx` — Reveal button transitions to answer +
  feedback view.
- `app/src/features/study/CardFeedback.tsx` — shared explanation + reference citation +
  Next card button.
- 11 new unit tests for `shuffleArray` and `mapRawCardToStudyCard` (76 total).

### Changed

- `app/src/app/page.tsx` — replaced health endpoint link with "Start studying →" button
  pointing to `/study`; badge updated to Phase 4; copy updated.

---

## [0.4.0] - 2026-05-17

### Added

- `app/src/lib/session/types.ts` — `SessionPayload` type shared across the session layer.
- `app/src/lib/session/codec.ts` — `signSession` / `verifySession` using HMAC-SHA256
  over a base64url-encoded JSON payload. Constant-time signature comparison via
  `crypto.timingSafeEqual`. No external libraries.
- `app/src/lib/session/cookies.ts` — `createSessionCookie` / `readSessionCookie` /
  `clearSessionCookie` via the async `cookies()` API from `next/headers`.
- `app/src/lib/auth/password.ts` — `verifyPassword` using `crypto.scrypt` in the same
  `<hash>.<salt>` format produced by the seed script.
- `app/src/proxy.ts` — optimistic auth guard (Next.js 16 renames middleware to proxy).
  Unauthenticated requests to protected routes redirect to `/login`; authenticated users
  on `/login` redirect to `/`. API routes and static assets are excluded from matching.
- `app/src/app/api/auth/login/route.ts` — `POST /api/auth/login`: looks up user by
  email, verifies password, sets signed session cookie. Returns 401 for any credential
  failure (same message to prevent enumeration).
- `app/src/app/api/auth/logout/route.ts` — `POST /api/auth/logout`: clears session cookie.
- `app/src/app/login/page.tsx` — Login page (Server Component); redirects to `/` if
  already authenticated.
- `app/src/app/login/LoginForm.tsx` — Login form (Client Component); posts to
  `/api/auth/login`, redirects to `/` on success, displays inline error on failure.
- `app/src/app/LogoutButton.tsx` — Sign out button (Client Component); posts to
  `/api/auth/logout` then redirects to `/login`.
- `SESSION_SECRET` env var (min 32 chars) added to `serverEnvSchema`, `docker-compose.yml`,
  and `.env.example`. Generate a production value with `openssl rand -base64 32`.
- `SESSION_MAX_AGE_SECONDS` env var (default 604800 = 7 days) added to schema.
- 15 new unit tests: 8 for the session codec, 7 for password verification (65 total).

### Changed

- `app/src/app/page.tsx` — home page now requires authentication (redirects to `/login`
  if unauthenticated); shows logged-in email and Sign out button; badge updated to Phase 3.
- `app/src/lib/env/server-schema.ts` — added `SESSION_SECRET` and `SESSION_MAX_AGE_SECONDS`
  to the Zod schema.
- `app/src/lib/env/server.ts` — passes the two new env vars to `serverEnvSchema.parse`.
- `app/src/lib/env/server.test.ts` — updated fixtures to include `SESSION_SECRET`; added
  two new test cases for the new fields (8 tests total, up from 6).

---

## [0.3.1] - 2026-05-17

### Changed

- `scripts/md_to_json.ts` — added comprehensive Markdown format reference to the file
  header: structural rules, full examples for all three source formats (MET-style,
  Q-style, Sample-style), and a field reference table.

---

## [0.3.0] - 2026-05-17

### Added

- Canonical JSON question format spec (`docs/question_generation_guide.md`) with a
  ready-to-paste LLM prompt, field definitions, media support (`attribution`, `origin`),
  and examples for all card types.
- Phase 2 implementation plan (`docs/phase_2_plan.md`).
- `app/src/lib/importer/types.ts` — shared `ParsedCard`, `ParsedChoice`, and
  `ParsedMedia` types used across the import pipeline.
- `app/src/lib/importer/json-parser.ts` — `parseJsonCards()` parses a JSON question
  file into `ParsedCard[]` using Zod for structural validation (21 unit tests).
- `app/src/lib/importer/validator.ts` — `validate()` performs semantic checks on a
  `ParsedCard[]` batch and returns `ValidationError[]` without throwing. Checks:
  `EMPTY_QUESTION`, `MISSING_ANSWER`, `NO_CORRECT_CHOICE` (errors),
  `MISSING_REFERENCE` (warning), and `DUPLICATE_SOURCE_ID` (error) (19 unit tests).
- JSDoc on all exported functions, types, and constants in `app/src/lib/`.
- JSDoc guideline added to `docs/project_guidelines.md`.
- `app/src/lib/importer/import-service.ts` — `importCards()` writes a validated
  `ParsedCard[]` batch to the database. Upserts cards by `(deckId, originalId)`,
  replaces choices/tags/source-references wholesale, and manages an `ImportBatch`
  audit row (`DRAFT` → `IMPORTED` / `FAILED`). Media assets are deferred to Phase 7.
- `app/scripts/import.ts` — CLI entry point wiring parser → validator → import
  service. Flags: `--dry-run` (validate only), `--force` (ignore errors), `--verbose`
  (list each card), `--deck <name>`, `--user <email>`.
- `app/package.json`: added `"import"` script shortcut (`tsx scripts/import.ts`).
- `data/questions/smoke_test.json` — three hand-written cards (single-correct MC,
  open-answer, multi-correct MC) used to verify the full pipeline end-to-end.
- `docker-compose.yml`: added `./data:/data` volume mount so JSON files at the
  repo root are accessible inside the container for import.
- `scripts/md_to_json.ts` — one-off Markdown → JSON migration script (repo root).
  Handles three source formats: MET-style (with Topic/Type/Difficulty/Tags),
  Q-style (Topic/Type only), and Sample-style (type in heading, bold question).
  Converts 923 cards from 17 source files with 0 warnings.
- `data/questions/*.json` — 923 migrated question cards committed as the
  portable source of truth for all deployments. Full import: 926 cards in the
  database (660 MC, 266 open answer, 2640 choices, 902 source references,
  642 tags).

### Changed

- `app/prisma/seed.ts`: after seeding the user and deck, automatically imports
  all `*.json` files from `$QUESTIONS_DIR` (default `/data/questions`) using the
  full parse → validate → import pipeline. Files with parse or validation errors
  are skipped with a warning; a missing directory is silently ignored (safe for CI).
  Switched from a local `PrismaClient` to the `lib/db/client` singleton so the
  seed and import service share one connection pool.
- `docs/app_architecture_plan.md`: import strategy updated to JSON-only; repo structure,
  progress checklist, and open decisions refreshed.
- `docs/core_domain_model.md`: diagram updated to reflect live Prisma schema (`Card.importBatchId`,
  `Card.originalId`, `MediaAsset` field notes).
- `README.md`: current status, documentation table, Docker workflow, and import commands
  updated to reflect Phase 2 progress.

---

## [0.2.0] - 2026-05-16

### Added

- Full Prisma schema with 13 models and 11 enums covering users, decks, cards, choices,
  tags, reviews, spaced-repetition progress, study sessions, import batches, and media
  assets.
- Initial database migration (`prisma/migrations/20260516202544_init`).
- Seed script creating a default user and "Canadian PPL" deck from environment variables;
  password hashed with `crypto.scrypt`.
- Prisma DB client singleton using the `@prisma/adapter-pg` driver adapter required by
  Prisma 7 (`src/lib/db/client.ts`).
- GitHub Actions CI workflow: lint, typecheck, and unit tests on Node 24, plus production
  Docker image build with GHA layer cache.
- `docs/project_status.md` tracking completed phases, next steps, and active technical
  decisions.

### Fixed

- Replaced Turbopack with Webpack (`--webpack` flag) in the dev container to resolve a
  FATAL panic caused by "Next.js package not found" in the named Docker volume setup.
- Pinned transitive dependencies (`postcss`, `@hono/node-server`) via npm `overrides` to
  resolve moderate audit vulnerabilities without breaking upgrades.
- Added `npx prisma generate` step to CI to make the generated client available for
  typecheck.
- Bumped `actions/checkout` and `actions/setup-node` to fix Node.js 20 deprecation
  warnings in CI.

---

## [0.1.0] - 2026-05-16

### Added

- Next.js App Router application scaffold with TypeScript and Tailwind CSS.
- Prisma installed and initialized for PostgreSQL.
- Docker Compose setup for the app and local PostgreSQL.
- OpenShift-conscious production Dockerfile using Next.js standalone output.
- Health endpoint at `/api/health`.
- Initial README with local development commands and documentation links.
