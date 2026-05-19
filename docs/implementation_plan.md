# PPL Flashcard App Implementation Plan

This document describes the implementation plan for the Canadian PPL flashcard app. It is updated as phases are completed and plans change.

## Guiding Approach

Build a usable vertical slice early, then expand.

The first meaningful milestone should prove the full app shape:

- local Docker development works,
- PostgreSQL and Prisma are wired up,
- existing Markdown cards can be imported,
- a user can log in,
- cards can be studied on a phone-friendly UI,
- progress can be saved.

Avoid spending too long on admin tools, polished analytics, or advanced spaced repetition before the core study loop exists.

---

## Phase 0: Project Setup ✓

Create the actual application foundation.

Tasks:

- Scaffold a Next.js app with TypeScript.
- Add Tailwind CSS and a base mobile-first layout system.
- Add Dockerfile for the app.
- Add `docker-compose.yml` for local development.
- Add PostgreSQL service for local development.
- Add Prisma.
- Add basic environment variable handling.
- Add linting, formatting, and test baseline.
- Add a health endpoint.
- Add initial OpenShift-friendly assumptions:
  - non-root runtime,
  - configurable port,
  - no runtime writes to the application directory,
  - environment-based configuration.

Deliverable:

- The app boots locally with Docker and directly with the Node package manager.

---

## Phase 1: Database and Core Models ✓

Create the schema before UI complexity grows.

Tasks:

- Add Prisma models for `User`, `Deck`, `Card`, `Choice`, `Tag`, `CardTag`,
  `SourceReference`, `MediaAsset`, `CardMedia`, `Review`, `CardProgress`,
  `StudySession`, `ImportBatch`.
- Create the initial migration.
- Add seed script: one default user, one Canadian PPL deck.
- Add a small database access layer.

Deliverable:

- Database schema exists, migrations run, and a seed user/deck are available.

---

## Phase 2: JSON Importer ✓

Define a canonical JSON question format and build the import pipeline. A one-off
migration script converts the existing Markdown files to JSON; the app itself only
ever reads JSON.

Tasks:

- Define the canonical JSON question format (see `docs/question_generation_guide.md`).
- Write a one-off migration script (`scripts/md_to_json.ts`) that converts all Markdown
  files in `Questions/` to JSON and writes them to `data/questions/`. Run once,
  commit the output.
- Build a JSON parser in the app (`app/src/lib/importer/json-parser.ts`).
- Add import validation: missing answer, missing reference, no correct choice for MC
  cards, duplicate source IDs.
- Create a CLI import command (`app/scripts/import.ts`, JSON only).
- Store import metadata in `ImportBatch`.

Deliverable:

- Existing questions are available as JSON in `data/questions/` and can be imported
  into PostgreSQL.

---

## Phase 3: Minimal Authentication ✓

Keep authentication simple but multi-user ready.

Tasks:

- Add local credentials login.
- Bootstrap the first user from a seed script.
- Add stateless HMAC-SHA256 signed session cookies.
- Add auth guards for app pages (proxy).
- Tie all study progress to `userId`.

Deliverable:

- A user can log in and access their own study data.

---

## Phase 4: First Study Experience ✓

Build the core mobile flashcard loop.

Tasks:

- Create a mobile-first study page.
- Add multiple-choice card flow: shuffle choices, reveal correctness, show explanation.
- Add open-answer card flow: show question, reveal answer, four self-rating buttons.
- Add basic progress indicator.
- Optimize layout for phone use.

Deliverable:

- The imported deck can be studied in a usable flashcard interface.

---

## Phase 5: Spaced Repetition V1 ✓

Add the first scheduler.

Tasks:

- Define four ratings: `wrong`, `hard`, `good`, `easy`.
- Store immutable `Review` rows.
- Update `CardProgress` after each review.
- Implement a simple SM-2-inspired interval algorithm.
- Add due-card selection; add `getDueCount` for the home page badge.
- Add source ID label and flag button with notes to study cards.
- Add question image support (`QuestionText` component parses inline Markdown images).

Deliverable:

- Study sessions can be driven by due cards; cards can be flagged with notes.

---

## Phase 6: Card Management UI ✓

Make the database the practical source of truth.

Tasks:

- Card browser at `/cards`: paginated list, full-text search, filters (type, difficulty,
  status, tag, flaggedOnly), sort. URL params drive all filters.
- Card detail/edit page at `/cards/[id]`.
- New card form at `/cards/new`.
- Flagged review queue at `/cards/flagged`.
- `CardRevision` model: one snapshot written before every save.

Deliverable:

- Questions can be maintained inside the app without editing files.

---

## Phase 7: User Management ✓

Add multi-user support with role-based access control.

Tasks:

- Add `Role` enum (`USER | EDITOR | ADMIN`) and `User.passwordVersion` to the schema.
- Add `LoginAttempt` model: 10 failures in 15 min locks the account (email-keyed to
  prevent user enumeration).
- Add `AdminEvent` model: append-only audit log for all admin actions.
- `src/lib/auth/permissions.ts` — `hasRole()` (pure rank comparison) and
  `requireRole(minRole)` (verifies `passwordVersion` against DB to reject stale sessions).
- `src/lib/auth/brute-force.ts` — lock check and attempt recording.
- Session cookie gains `role` and `passwordVersion`.
- Proxy updated with role-based route guards (optimistic, no DB query).
- Admin UI at `/admin/users`: create, edit (role + display name), reset password, delete.
  Server-side guards: cannot delete self, cannot remove last admin.
- `/profile` — change-own-password (increments `passwordVersion` to invalidate other sessions).

Deliverable:

- The app supports three roles with a full admin UI and brute-force login protection.

---

## Phase 8: Bulk Import UI ✓

Move import from command line to an application workflow.

Tasks:

- Three-step import wizard at `/import` (EDITOR+ only).
- Step 1 — Upload: file picker (`.json`, max 5 MB) or paste raw JSON.
- Step 2 — Preview: `dryRunImport` server action returns create/update counts, hard
  errors (block import), warnings, and a sample of the first 10 cards.
- Step 3 — Done: `runImport` server action writes cards and records `ImportBatch` row
  with raw JSON for audit.
- Recent import history shown below the wizard.
- Proxy updated: `/import` requires EDITOR role.
- Home page: Import cards button for EDITOR+ users.

Deliverable:

- The deck can be extended from inside the app without CLI access.

---

## Phase 9: PWA and Mobile Polish ✓

Make the app feel good on a phone.

Tasks:

- Add PWA manifest and generated app icons (Next.js `ImageResponse`).
- Add theme color and viewport polish.
- Support home-screen installation.
- Service worker: cache-first for static assets, network-first for navigation.
- Rating buttons bumped to ≥44 px touch target (Apple HIG minimum).
- Safe-area padding for iPhone home indicator.

Deliverable:

- The app behaves like a clean installable mobile study tool.

---

## Phase 10: Cleanup and UI Improvements ✓

Reduce clutter and improve the user experience before adding new features.

Tasks:

- Remove converted Markdown question files from `Questions/` (JSON in `data/questions/`
  is the source of truth).
- Remove source assets and reference PDFs that are no longer needed.
- Review and update all planning documentation.
- UI polish: improve empty states, loading indicators, and navigation consistency.

Deliverable:

- Codebase and repo are tidy; UI rough edges are smoothed before the next phase.

---

## Phase 11: Export and Backup Tools ← current

Keep the content portable before deploying to production.

Tasks:

- Export all cards for a deck to JSON (round-trip compatible with the importer format).
- Optional CSV export for spreadsheet review.
- Include tags, references, difficulty, status, and deck information in the export.
- Download via the browser (no server-side file storage needed).
- Add export UI in the card browser (EDITOR+ only).

Deliverable:

- Database content can be exported and re-imported, or reviewed outside the app.
  Provides a safety net before the first production deployment.

---

## Phase 12: OpenShift Deployment

Make production deployment repeatable.

Tasks:

- Add production Dockerfile (already done; validate and harden).
- Add Helm chart.
- Add Kubernetes/OpenShift resources: Deployment, Service, Route, Secret templates,
  ConfigMap, migration Job, health/readiness probes.
- Ensure non-root arbitrary UID compatibility.
- Document production environment variables and migration workflow.

Deliverable:

- The app can be deployed to APPUiO/OpenShift.

---

## Phase 13: Media Support V1

Support image, chart, table, and diagram questions in the app.

Tasks:

- Wire `MediaAsset` and `CardMedia` into the app.
- Add upload UI for attaching images to cards.
- Display media on the question or answer side.
- Store source information and alt text.
- For local development, serve from app container or local volume.
- Design for S3-compatible object storage in production.

Deliverable:

- Image/chart-based questions work in the study interface.

---

## Phase 14: Improvements After Daily Use

Improve based on real study friction.

Possible features:

- Better stats dashboard.
- Exam readiness estimate.
- Smarter spaced repetition (FSRS evaluation).
- Offline queue and sync.
- AI-assisted card creation.
- Duplicate detection.
- Deck versioning.
- Better media library management.

Deliverable:

- Product direction is informed by actual study use, not only up-front speculation.

---

## First Milestone (complete)

> Run locally with Docker, import existing Markdown cards into PostgreSQL, log in as the seed user, and study random/due cards on a phone-friendly UI.

Phases 0–5 completed this milestone.
