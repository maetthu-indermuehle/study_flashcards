# Changelog

All notable changes to this project will be documented in this file.

This project uses semantic versioning. Every push increments the patch version;
completing a phase increments the minor version and resets the patch to 0.

## [Unreleased]

---

## [0.10.1] - 2026-05-18

### Added

- **Multi-subject (deck) support** — the app is no longer single-topic:
  - JSON files can now use a wrapper format `{"subject": "...", "cards": [...]}`.
    The `subject` value becomes the deck name and is created automatically on first
    import. The old bare-array format is still accepted for backward compatibility.
  - `ParsedBatch` type and `parseJsonBatch()` parser in `json-parser.ts` handle both
    formats. `parseJsonCards()` is kept as a thin alias for backward compat.
  - `import-service.ts` now does `findOrCreate` on the deck instead of throwing when
    the deck does not exist yet.
  - `dryRunImport` and `runImport` server actions use `parseJsonBatch`; they resolve
    the target deck name from the JSON subject (or fall back to the user's existing
    deck). Both return `deckName` in the success result.
  - Import preview shows the target deck name; done step names the deck.
  - `listSubjectGroups()` query returns all user decks as top-level accordion items.
  - `StudySetup` three-level accordion: **Subject → Topic group → Sub-topic**.
    When the user has only one deck the subject row is hidden, preserving the existing UX.
  - `getNextCard` and `getDueCount` now search across all of the user's decks instead
    of only the first one found.
  - CLI script uses `subject` from JSON when present; `--deck` is the fallback.
  - `question_generation_guide.md` documents both JSON formats and updates the LLM
    prompt to output the wrapper format.
- 7 new unit tests for `parseJsonBatch` (legacy and wrapper formats, error cases).

---

## [0.10.0] - 2026-05-17

### Added

- **Phase 8 — Bulk import UI** (branch `phase-8-bulk-import`).
- Three-step import wizard at `/import` (EDITOR+ only):
  - **Step 1 — Upload**: file picker (`.json`, max 5 MB) or paste raw JSON.
    Client-side card count detected before upload.
  - **Step 2 — Preview**: dry-run server action parses and validates the JSON,
    queries which source IDs already exist, and returns total/new/update counts,
    hard errors (block import), warnings (allow import), and a sample of the first 10
    cards. Import is blocked until all hard errors are resolved.
  - **Step 3 — Done**: confirmation with created/updated counts and a link to browse
    cards or import another file.
- `src/lib/import/actions.ts` — two Server Actions:
  - `dryRunImport(json)` — parse + validate + DB check, no writes.
  - `runImport(json)` — parse + validate + write; stores raw JSON in `ImportBatch`
    for audit. Returns `batchId`, created, updated counts.
  - `getImportHistory()` — last 10 `ImportBatch` rows for the current user.
- `src/lib/import/dry-run-helpers.ts` — pure helpers (`partitionCounts`,
  `buildSample`) extracted from the dry-run action for testability.
- 11 new unit tests for `partitionCounts` and `buildSample` (161 total).
- Proxy updated: `/import` route now requires EDITOR role.
- Home page: **Import cards** button shown for EDITOR and ADMIN users.
- Recent import history shown below the wizard on the `/import` page.

---

## [0.9.0] - 2026-05-18

### Added

- **Phase 7 — User management** (branch `phase-7-user-management`).
- `Role` enum in Prisma schema: `USER | EDITOR | ADMIN` with clear permission
  boundaries (study/flag → USER+; card create/edit/import → EDITOR+; manage users → ADMIN).
- `User.role` and `User.passwordVersion` fields (migration
  `20260518024256_add_roles_and_audit`). `passwordVersion` is incremented on every
  password change or role change; the value is embedded in the session cookie so the
  server can invalidate stale sessions without a session store.
- `LoginAttempt` model — tracks every login attempt (succeeded/failed) per email.
  After 10 failures in 15 minutes the account is locked. Rows older than 24 h are
  pruned on every write.
- `AdminEvent` model — append-only audit log: actor, target, action string
  (`CREATE_USER`, `CHANGE_ROLE`, `RESET_PASSWORD`, `DELETE_USER`), JSON detail blob.
- `src/lib/auth/permissions.ts` — `hasRole()` (pure rank comparison) and
  `requireRole(minRole)` (session read + DB `passwordVersion` check). All card
  management Server Actions upgraded from `requireUser()` to `requireRole("EDITOR")`.
- `src/lib/auth/brute-force.ts` — `isAccountLocked()` / `recordLoginAttempt()` backed
  by the `LoginAttempt` table. Checked before the password comparison in the login route
  so lock-out is the same whether the account exists or not.
- `hashPassword()` and `MIN_PASSWORD_LENGTH` (10 chars) exported from
  `src/lib/auth/password.ts`; seed script delegates to this function instead of
  duplicating scrypt logic.
- `src/lib/session/types.ts` — `UserRole` type; `SessionPayload` gains `role` and
  `passwordVersion` fields.
- `createSessionCookie()` now accepts `role` and `passwordVersion`.
- `src/proxy.ts` — role-based route guards: `/admin/*` → ADMIN, `/cards/*` → EDITOR,
  everything else → USER. Optimistic (no DB query); Server Components and Actions are
  the authoritative gate.
- `/api/auth/login` — brute-force check before credential lookup; passes `role` and
  `passwordVersion` into the session cookie.
- Admin UI at `/admin/users`: paginated user table, create-user form, per-user edit
  page (display name + role), reset-password form, delete-user button with two-step
  confirmation. Server-side guards: cannot delete self, cannot demote/delete the last
  admin.
- `/profile` — change-own-password form (requires current password; increments
  `passwordVersion` on success, invalidating other sessions).
- Home page header: **Profile** link for all users; **Admin** badge-link for ADMIN role.
- 21 new unit tests (150 total): `hashPassword` round-trip, `hasRole` matrix, password
  policy, role validation, last-admin guard logic, codec round-trip with new fields.

### Changed

- Seed script: bootstrap user is now created/updated with `role: "ADMIN"`.
- `src/lib/cards/actions.ts`: `requireUser()` replaced by `requireEditor()` (calls
  `requireRole("EDITOR")`) in all card mutation actions.

---

## [0.8.0] - 2026-05-17

### Added

- **Phase 9 — PWA and mobile polish** (branch `phase-6-card-management`).
- `app/src/app/manifest.ts` — Web App Manifest: `standalone` display mode, portrait
  orientation, `#0f172a` theme colour, references 192×192 and 512×512 PNG icons.
- `app/public/icons/icon-192.png` and `icon-512.png` — generated with sharp from an
  SVG source (dark-slate background, white "PPL" text).
- `app/src/app/icon.tsx` — dynamically generated browser-tab favicon (32×32) via
  Next.js `ImageResponse`.
- `app/src/app/apple-icon.tsx` — dynamically generated iOS home-screen icon (180×180)
  via Next.js `ImageResponse`.
- `app/public/sw.js` — service worker: cache-first for static assets, network-first
  for navigation. Enables the PWA install prompt on HTTPS/localhost.
- `app/src/components/ServiceWorkerRegistration.tsx` — client component that registers
  the service worker on mount; silent no-op if SW is unsupported or on HTTP.
- `app/src/app/layout.tsx` updated: `Viewport` export for `theme-color`, `viewportFit:
  cover`, `appleWebApp` capable/status-bar meta tags, `ServiceWorkerRegistration`
  component added to the root layout.

### Changed

- `app/src/app/globals.css` — added `-webkit-tap-highlight-color: transparent` (removes
  iOS blue/grey tap flash), `touch-action: manipulation` on buttons/links (eliminates
  300 ms click delay), `overscroll-behavior-y: contain` (prevents pull-to-refresh
  interfering with card interactions), and `.safe-bottom` / `.safe-top` utilities for
  `env(safe-area-inset-*)` padding on notched iPhones.
- Study page and home page outer containers use `.safe-bottom` so content clears the
  iPhone home-indicator bar.
- Rating buttons in `CardFeedback` bumped from `py-3` to `py-3.5` (≥44 px touch
  target per Apple HIG).
- Home page phase badge updated to "Phase 9".

---

## [0.7.0] - 2026-05-17

### Added

- **Phase 6 — Card management UI** (branch `phase-6-card-management`).
- `app/src/lib/cards/types.ts` — plain TypeScript types for the card management
  feature: `CardListItem`, `CardDetail`, `CardFilters`, `CardFormData`, `TagOption`, etc.
- `app/src/lib/cards/queries.ts` — `listCards` (paginated, filtered browser query),
  `getCard` (full detail for edit page), `listTags` (tag options excluding the internal
  flagged marker).
- `app/src/lib/cards/actions.ts` — Server Actions: `createCard`, `updateCard`,
  `archiveCard`, `deleteCard`, `saveFlaggedCard`. Every `updateCard` call writes a
  `CardRevision` snapshot before applying changes so full edit history is preserved.
- `app/src/app/cards/page.tsx` — card browser at `/cards`: searchParams-driven filters
  (search, type, difficulty, status, flaggedOnly, sort), pagination, "New card" and
  "Review flagged" shortcuts.
- `app/src/app/cards/[id]/page.tsx` — card detail/edit page; shows flag note banner
  when flagged.
- `app/src/app/cards/new/page.tsx` — blank card creation form.
- `app/src/app/cards/flagged/page.tsx` — flagged review queue at `/cards/flagged`.
- `app/src/features/cards/CardBrowser.tsx` — client component for filter state and card
  list; uses `useTransition` + `router.push` to update URL search params without losing
  Server Component data fetching.
- `app/src/features/cards/CardForm.tsx` — shared create/edit form: type selector,
  question/answer/explanation textareas, difficulty/status selects, ChoiceEditor (MC),
  TagSelector, and a collapsible source reference section. Accepts optional `onSave`
  callback for embedding in the flagged queue.
- `app/src/features/cards/ChoiceEditor.tsx` — multiple-choice option editor with
  correct/incorrect toggle, add, remove.
- `app/src/features/cards/TagSelector.tsx` — multi-select from existing tags (grouped
  by type) with inline new-tag creation form.
- `app/src/features/cards/FlaggedQueue.tsx` — step-through review of all flagged cards;
  shows flag note, full edit form, and three actions: "Save & clear flag", "Save & keep
  flagged", "Skip".
- `app/src/lib/cards/queries.test.ts` / `actions.test.ts` — 36 new unit tests covering
  filter defaults, flag detection, due-date formatting, form validation, and tag
  deduplication. Total test count: 129.
- `CardRevision` model added to Prisma schema (`app/prisma/schema.prisma`) with
  migration `20260517203443_add_card_revision`. Stores a JSON snapshot of the card
  state before every edit (question, answer, explanation, difficulty, status, choices,
  tags, flagNote).
- "Browse cards" button added to the home page.
- "Edit" link added to the study toolbar (next to the flag button) linking to
  `/cards/[id]`.

---

## [0.6.4] - 2026-05-17

### Changed

- Updated `README.md`, `docs/project_status.md`, `docs/app_architecture_plan.md`, and
  `docs/core_domain_model.md` to reflect all Phase 5 work: SM-2 scheduler, review
  rating, due-card queue, question images, card flagging, and flag notes.
  `CardTag.note` added to the ER diagram. Resolved duplicate open-decision entry in
  architecture plan.

---

## [0.6.3] - 2026-05-17

### Added

- `app/public/assets/` — 30 question images (PNG) committed as static assets
  served by Next.js at `/assets/<filename>`.
- `app/src/features/study/QuestionText.tsx` — parses the Markdown image syntax
  embedded in question text (`![alt](assets/FILENAME.png) question body`) and
  renders the image above the question text. Questions without an image render
  as before. Used by both `MultipleChoiceCard` and `OpenAnswerCard`.

---

## [0.6.2] - 2026-05-17

### Added

- `app/prisma/schema.prisma` — added `note String?` to `CardTag`. Migration
  `20260517071643_add_card_tag_note` applies a safe nullable column addition.
- Flag notes — clicking the flag button opens an inline amber panel with a
  textarea. Notes are saved alongside the flag (`POST /api/study/flag` now
  accepts `note` and `unflag` fields). Flagged cards show an "Edit flag note"
  panel pre-filled with the existing note; a "Remove flag" button unflagged the
  card entirely. The note is fetched alongside the card and pre-populated on
  every render.

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
