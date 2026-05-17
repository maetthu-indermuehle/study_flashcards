# PPL Flashcard App Implementation Plan

This document describes the proposed implementation plan for the Canadian PPL flashcard app. It is intended as a practical build roadmap that can be updated as decisions change.

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

## Phase 0: Project Setup

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

## Phase 1: Database and Core Models

Create the schema before UI complexity grows.

Tasks:

- Add Prisma models for:
  - `User`
  - `Deck`
  - `Card`
  - `Choice`
  - `Tag`
  - `CardTag`
  - `SourceReference`
  - `MediaAsset`
  - `CardMedia`
  - `Review`
  - `CardProgress`
  - `StudySession`
  - `ImportBatch`
- Create the initial migration.
- Add seed script for:
  - one default user,
  - one Canadian PPL deck.
- Add a small database access layer.

Deliverable:

- Database schema exists, migrations run, and a seed user/deck are available.

## Phase 2: JSON Importer

Define a canonical JSON question format and build the import pipeline.
A one-off migration script converts the existing Markdown files to JSON;
the app itself only ever reads JSON.

Tasks:

- Define the canonical JSON question format (see `docs/question_generation_guide.md`).
  This is the single source of truth for all future questions, including those
  generated with ChatGPT or Claude.
- Write a one-off migration script (`scripts/md_to_json.ts`, repo root) that converts
  all existing Markdown files in `Questions/` to JSON and writes them to `data/questions/`.
  This script handles the three Markdown format variants found in the existing files.
  Run it once, commit the output, and it is no longer needed.
- Build a JSON parser in the app (`app/src/lib/importer/json-parser.ts`).
- Add import validation:
  - missing answer,
  - missing reference,
  - no correct choice for multiple-choice cards,
  - duplicate source IDs within a batch.
- Create a CLI import command (`app/scripts/import.ts`, JSON only).
- Store import metadata in `ImportBatch`.

Deliverable:

- Existing questions are available as JSON in `data/questions/` and can be imported
  into PostgreSQL. All future questions follow the same JSON format.

## Phase 3: Minimal Authentication

Keep authentication simple but multi-user ready.

Tasks:

- Add local credentials login.
- Bootstrap the first user from a seed script or environment-backed setup.
- Add session handling.
- Add auth guards for app pages.
- Tie all study progress to `userId`.
- Keep the auth boundary clean so OAuth, magic links, or OIDC can be added later.

Deliverable:

- A user can log in and access their own study data.

## Phase 4: First Study Experience

Build the core mobile flashcard loop.

Tasks:

- Create a mobile-first study page.
- Add study session modes:
  - due cards,
  - random cards,
  - by topic/tag.
- Add multiple-choice card flow:
  - shuffle answer choices at study time,
  - allow answer selection,
  - reveal correctness,
  - show explanation and reference.
- Add open-answer card flow:
  - show question,
  - show answer on button press,
  - show explanation and reference,
  - show four self-rating buttons.
- Add basic progress indicator.
- Ensure desktop works, but optimize layout for phone use.

Deliverable:

- The imported deck can be studied in a usable flashcard interface.

## Phase 5: Spaced Repetition V1

Add the first scheduler.

Tasks:

- Define four ratings:
  - `wrong`
  - `hard`
  - `good`
  - `easy`
- Store immutable `Review` rows.
- Update `CardProgress` after each review.
- Implement a simple SM-2-inspired interval algorithm:
  - wrong: repeat soon and reduce/reset interval,
  - hard: short interval increase,
  - good: normal interval increase,
  - easy: larger interval increase.
- Add due-card selection.
- Add weak-card selection.
- Add basic review statistics.

Deliverable:

- Study sessions can be driven by due cards instead of only random card selection.

## Phase 6: Card Management UI

Make the database the practical source of truth.

Tasks:

- Browse cards.
- Search cards.
- Filter by:
  - topic,
  - tag,
  - type,
  - difficulty,
  - source.
- View full card detail.
- Create cards.
- Edit cards.
- Archive cards.
- Manage multiple-choice options.
- Manage tags.
- Manage references.

Deliverable:

- Questions can be maintained inside the app without editing Markdown.

## Phase 7: Media Support V1

Support image, chart, table, and diagram questions.

Tasks:

- Wire `MediaAsset` and `CardMedia` into the app.
- Attach existing image assets from `Questions/assets`.
- Display media on the question side or answer side.
- Store media source information.
- Add alt text support.
- For local development, begin with local app-served files or a local storage volume.
- Keep the design ready for object storage later.

Deliverable:

- Image/chart-based questions work in the study interface.

## Phase 8: Bulk Import UI

Move import from command line to an application workflow.

Tasks:

- Add Markdown upload or paste input.
- Preview parsed cards.
- Show validation errors and warnings.
- Confirm import.
- Track import status in `ImportBatch`.
- Avoid duplicate imports where possible.
- Allow imported cards to start as draft or published.

Deliverable:

- The deck can be extended from inside the app.

## Phase 9: PWA and Mobile Polish

Make the app feel good on a phone.

Tasks:

- Add PWA manifest.
- Add app icons.
- Add theme color.
- Polish mobile viewport behavior.
- Support home-screen installation.
- Improve loading states.
- Improve empty states.
- Review touch target sizes.
- Add basic static asset caching if straightforward.

Deliverable:

- The app behaves like a clean installable mobile study tool.

## Phase 10: OpenShift Deployment

Make production deployment repeatable.

Tasks:

- Add production Dockerfile.
- Add Helm chart.
- Add Kubernetes/OpenShift resources:
  - Deployment,
  - Service,
  - Route,
  - Secret templates,
  - ConfigMap,
  - migration Job,
  - health/readiness probes.
- Ensure non-root arbitrary UID compatibility.
- Document production environment variables.
- Document migration workflow.

Deliverable:

- The app can be deployed to APPUiO/OpenShift.

## Phase 11: Export and Backup Tools

Keep the content portable.

Tasks:

- Export cards to Markdown.
- Export cards to JSON.
- Optional CSV export.
- Include:
  - tags,
  - references,
  - media metadata,
  - deck information.
- Add simple backup and restore notes.

Deliverable:

- Database content can be exported and reviewed outside the app.

## Phase 12: Improvements After Daily Use

Improve based on real study friction.

Possible features:

- Better stats dashboard.
- Exam readiness estimate.
- Smarter spaced repetition.
- FSRS scheduler evaluation.
- Offline queue and sync.
- AI-assisted card creation.
- Duplicate detection.
- Instructor-created decks.
- Shared decks.
- Deck versioning.
- Better media library management.

Deliverable:

- Product direction is informed by actual study use, not only up-front speculation.

## Recommended Build Order

The preferred order is a vertical slice:

1. Scaffold app and database.
2. Define schema.
3. Import Markdown via CLI.
4. Build study UI.
5. Add spaced repetition.
6. Add editing and import UI.
7. Add media support.
8. Add PWA polish.
9. Add OpenShift deployment.
10. Add export and advanced study tools.

## First Milestone

The first milestone should be:

> Run locally with Docker, import existing Markdown cards into PostgreSQL, log in as the seed user, and study random/due cards on a phone-friendly UI.

This milestone proves the core technical and product assumptions while keeping the scope small enough to finish quickly.

