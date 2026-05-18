# PPL Flashcard App Architecture Plan

## Goal

Build a mobile-first flashcard web app for studying Canadian PPL groundschool material. The app should be simple to use on a phone, visually polished, and structured so that one user can start studying quickly while the system remains multi-user capable from day one.

The current Markdown question files are seed material only. The application database will become the source of truth for questions, answers, references, assets, and user progress.

## Product Principles

- The first screen should be the study experience, not a marketing page or heavy dashboard.
- The UI should be fast, quiet, thumb-friendly, and optimized for repeated short study sessions.
- The app should support both quick review and deeper learning through explanations, references, and media.
- The data model should preserve enough history to improve spaced repetition later without a disruptive migration.
- The architecture should stay simple enough for local Docker development and OpenShift deployment.

## Initial Scope

Version 1 should focus on:

- Importing the existing Markdown question batches into the database.
- Studying due cards, random cards, and topic/tag filtered cards.
- Supporting multiple-choice and open-answer cards.
- Tracking per-user review progress.
- Simple login for one primary user, with a clean path to richer authentication later.
- Editing cards in the app.
- Adding individual new cards in the app.
- Supporting media attachments such as images, diagrams, tables, graphs, and later videos.

Version 1 does not need:

- Complex role management.
- Public registration.
- Collaborative editing.
- Full offline sync.
- Sophisticated AI import workflows.

## Recommended Stack

### Application

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Server Actions and/or Route Handlers for mutations and API endpoints
- Prisma ORM
- PostgreSQL

This keeps the app full-stack in one language and one deployable container. It is a good fit for a small production app with authenticated data, mobile UI, server-side rendering where useful, and interactive client components for the study flow.

### Local Development

Use Docker Compose with:

- `app`: Next.js development container
- `db`: PostgreSQL
- optional `object-storage`: MinIO later, if we want local S3-compatible media storage

### Production

Deploy to APPUiO/OpenShift as containers:

- Next.js app container
- PostgreSQL from a managed service or cluster-provided database if available
- object storage for uploaded media, preferably S3-compatible if available

The app container must work with OpenShift's restricted security model:

- Do not require privileged containers.
- Do not require root at runtime.
- Avoid writing to the application filesystem at runtime except permitted temporary directories.
- Use environment variables and mounted secrets/config for runtime configuration.
- Ensure the image can run with an arbitrary user ID.

## Database Choice

### Recommendation: Start With PostgreSQL

PostgreSQL is the best starting choice for this app.

Reasons:

- It matches the production direction better than SQLite.
- It handles multi-user progress, imports, filtering, and review history cleanly.
- It works well with Prisma migrations.
- It avoids a later database migration at exactly the point where user progress matters.
- It supports JSON fields when useful, without giving up relational structure.

### SQLite

SQLite would be simpler for a local prototype, but it becomes less ideal once the app needs:

- multi-user progress,
- server-side sync across devices,
- concurrent writes,
- production deployment on OpenShift,
- reliable backups and migrations.

There is a possible migration path from SQLite to PostgreSQL when using Prisma, but it still requires care around schema differences, migrations, IDs, data export/import, and production cutover. Since this app already needs server-side progress sync, starting with PostgreSQL is cleaner.

### MariaDB

MariaDB would work, but it is not the preferred choice here.

Reasons:

- Prisma and modern TypeScript app examples tend to have very strong PostgreSQL support.
- PostgreSQL is excellent for relational data plus occasional JSON metadata.
- PostgreSQL is a common default for Kubernetes-hosted web apps.

MariaDB is a reasonable option if the production platform already provides it more easily, but otherwise PostgreSQL is the better default.

## Authentication

The app should be multi-user capable from day one, but user management should stay minimal at first.

Initial approach:

- Implement a simple local authentication provider.
- One admin/user can be created via seed script or environment-backed bootstrap flow.
- Use secure password hashing.
- Use database-backed sessions or a well-supported auth library.

Architecture requirements:

- The `User` model exists from the beginning.
- Progress is always tied to a user.
- Card ownership and import ownership are tied to a user where relevant.
- Auth code is isolated behind a small interface so OAuth, magic links, or SSO can be added later.

Possible future providers:

- email/password
- magic link
- GitHub
- Google
- OpenShift/OIDC provider if useful later

## PWA and Offline Strategy

### How Complex Is PWA Support?

Basic PWA support is not very complex:

- app manifest,
- mobile icons,
- theme color,
- installable home-screen app feel,
- responsive layout,
- service worker for static asset caching.

This gives the app a more native feel on a phone without changing the backend architecture.

True offline study with sync is more complex:

- cards must be cached locally,
- review actions must be queued offline,
- conflicts must be resolved when multiple devices review the same card,
- media files need local caching rules,
- the spaced repetition scheduler must handle delayed sync.

### Recommendation

Build the UI as PWA-ready from the start, but do not implement full offline sync in version 1.

Version 1:

- responsive mobile-first UI,
- installable PWA manifest,
- basic static caching if straightforward,
- online-only study sessions.

Later:

- local IndexedDB cache for due cards and assets,
- offline review queue,
- sync endpoint,
- conflict strategy based on review timestamps.

## Core Domain Model

See also: [Core Domain Model](./core_domain_model.md) for a Mermaid ER diagram of the planned entities and relationships.

### User

Represents a person using the app.

Important fields:

- `id`
- `email`
- `displayName`
- `passwordHash` or external auth identity
- `createdAt`
- `updatedAt`

### Deck

Represents a collection of cards, for example "Canadian PPL".

Important fields:

- `id`
- `name`
- `description`
- `visibility`
- `createdByUserId`

### Card

Represents one study item.

Important fields:

- `id`
- `deckId`
- `type`: `multiple_choice` or `open_answer`
- `question`
- `answer`
- `explanation`
- `difficulty`
- `status`: `draft`, `published`, `archived`
- `createdByUserId`
- `sourceImportId`
- `createdAt`
- `updatedAt`

Notes:

- The question, answer, and explanation should allow rich text later, but plain text or Markdown-like input is enough for version 1.
- Cards should not rely on the original Markdown file once imported.

### Choice

Represents one multiple-choice option.

Important fields:

- `id`
- `cardId`
- `text`
- `isCorrect`
- `sortOrder`

The app should randomize choices at study time. The stored order is only for editing.

### Tag

Represents flexible classification.

Important fields:

- `id`
- `name`
- `type`: `topic`, `source`, `skill`, `exam_area`, `custom`

Examples:

- `meteorology`
- `airlaw`
- `canadian-weather-products`
- `pstar`
- `transport-canada`
- `faa-weather`
- `mountain-weather`

### CardTag

Join table between cards and tags.

### SourceReference

Stores source and reference details.

Important fields:

- `id`
- `cardId`
- `label`
- `url`
- `documentName`
- `page`
- `section`
- `notes`

This lets a card reference Transport Canada manuals, Canadian regulations, images, charts, or imported files.

### MediaAsset

Represents images, charts, tables, diagrams, audio, or video attached to a card.

Important fields:

- `id`
- `ownerUserId`
- `storageKey`
- `publicUrl` or signed URL metadata
- `mimeType`
- `kind`: `image`, `table`, `graph`, `video`, `pdf_excerpt`, `other`
- `altText`
- `sourceLabel`
- `sourceUrl`
- `licenseNotes`
- `createdAt`

### CardMedia

Join table between cards and media assets.

Important fields:

- `cardId`
- `mediaAssetId`
- `role`: `question_context`, `answer_explanation`, `reference`, `thumbnail`
- `sortOrder`

### Review

Immutable review history.

Important fields:

- `id`
- `userId`
- `cardId`
- `rating`: `wrong`, `hard`, `good`, `easy`
- `answeredCorrectly`
- `responseMs`
- `reviewedAt`
- `sessionId`

Review history should be append-only so that the scheduler can be changed later.

### CardProgress

Current spaced repetition state for one user and one card.

Important fields:

- `userId`
- `cardId`
- `dueAt`
- `lastReviewedAt`
- `intervalDays`
- `ease`
- `stability`
- `difficulty`
- `lapses`
- `reviewCount`
- `lastRating`

The fields should allow either a simple SM-2-like algorithm or a future FSRS-style scheduler.

### StudySession

Represents one study run.

Important fields:

- `id`
- `userId`
- `mode`: `due`, `random`, `topic`, `tag`, `weak`, `custom`
- `filters`
- `startedAt`
- `endedAt`

### ImportBatch

Represents an import operation.

Important fields:

- `id`
- `userId`
- `sourceType`: `markdown`, `json`, `csv`, `manual`, `ai_generated`
- `status`: `draft`, `validated`, `imported`, `failed`
- `rawInput`
- `summary`
- `createdAt`

### CardRevision

Append-only edit history for a card. One row is written before every save so the full card state at each point in time can be reconstructed.

Important fields:

- `id`
- `cardId`
- `editedByUserId`
- `editedAt`
- `reason` — optional label, e.g. `"flagged edit"`, `"manual correction"`
- `snapshot` — JSON blob: question, answer, explanation, difficulty, status, choices, tags, flagNote

The `snapshot` field is a JSON blob rather than normalised columns so the shape can evolve without additional migrations. The Phase 6 edit actions write revisions silently; the UI for browsing and restoring history is deferred to a later phase.

## Study Modes

The app should support:

- Due cards
- Random all-topic practice
- Topic/tag-specific practice
- Weak cards
- New cards
- Custom filtered session

Filters should be based on:

- deck,
- tags,
- card type,
- difficulty,
- source,
- due status,
- previous rating/performance.

## Card Interaction Design

### Multiple Choice Cards

Flow:

1. Show question and any media assets needed for context.
2. Show answer choices in randomized order.
3. User taps an answer.
4. Show whether it was correct.
5. Show correct answer, explanation, references, and media if relevant.
6. User continues to next card.

Scheduler mapping can infer rating:

- correct quickly: `easy` or `good`
- correct slowly or after uncertainty: `good`
- wrong: `wrong`

We may still allow a manual difficulty rating after multiple-choice answers later.

### Open Answer Cards

Flow:

1. Show question and media.
2. User thinks through answer.
3. User taps "Show answer".
4. Show answer, explanation, reference, and media.
5. User rates themselves with four buttons:
   - Totally wrong
   - Hard
   - Good
   - Exactly right

These map directly to spaced repetition ratings.

## Spaced Repetition

### Version 1 Recommendation

Use a simple four-rating scheduler inspired by SM-2:

- `wrong`: repeat soon, reset or reduce interval
- `hard`: short interval increase
- `good`: normal interval increase
- `easy`: larger interval increase

Keep the algorithm isolated in a scheduler module:

- input: current `CardProgress`, new `Review`
- output: updated `CardProgress`

This makes it easy to replace later with FSRS or another algorithm.

### Why Not Start With a Complex Scheduler?

The most important part for version 1 is collecting review history consistently. Once review data exists, the scheduler can become more sophisticated. A complicated algorithm before we have real usage data may slow development without improving the first study experience much.

## Import and Export

### JSON as the canonical import format

The app only reads JSON for imports. The question format is defined in
`docs/question_generation_guide.md` and serves as the contract for both the importer
and for LLM-generated content.

Key design decisions:

- **No Markdown import in the app.** The existing Markdown files in `Questions/` are
  converted once by a standalone migration script (`scripts/md_to_json.ts`) and the
  resulting JSON files are committed to `data/questions/`. After that conversion, the
  Markdown files are archived and the database is the source of truth.
- **All future questions are authored in JSON**, whether written by hand, generated with
  ChatGPT or Claude (using the prompt in the generation guide), or produced by other
  tooling.
- **Multiple correct choices are supported.** Choices carry an explicit `isCorrect`
  boolean to support "select all that apply" question types.

The CLI import command (`app/scripts/import.ts`) parses and validates JSON, creates an
`ImportBatch` record, and upserts cards by `sourceId` so re-runs are safe.

### Future Bulk Import UI

A browser-based import flow (Phase 8) will let users paste or upload JSON, preview
parsed cards with validation feedback, and confirm the import.

Import validation checks:

- missing answer,
- no correct choice on a multiple-choice card,
- duplicate source ID within a batch,
- missing reference.

### Export

Later, build exporters for:

- Markdown
- JSON
- CSV

Markdown export should be able to recreate a study-friendly document similar to the current question files, but generated from the database.

## Media and References

Some cards need images, charts, tables, graphs, or videos.

Recommended design:

- Store media metadata in Postgres.
- Store actual files outside the database.
- In local development, use local volume or MinIO.
- In production, use S3-compatible object storage if available.

For small version 1, media can begin as files served by the app container or mounted storage, but this should not become the long-term production design because OpenShift containers should be treated as ephemeral.

Every media asset should track:

- where it came from,
- license/source notes when known,
- alt text for accessibility,
- which cards use it.

## Deployment Architecture

### Local Docker Compose

Services:

- `web`: Next.js app
- `postgres`: database
- optional `minio`: local object storage

Development workflow:

- run migrations,
- import seed Markdown,
- start app,
- study locally on phone via LAN URL if useful.

### OpenShift/APPUiO

Use Helm or Kustomize from the beginning.

Recommended Kubernetes/OpenShift resources:

- Deployment for the web app
- Service
- Route
- Secret for database URL and auth secrets
- ConfigMap for non-secret settings
- Job for migrations or a controlled migration command
- PersistentVolumeClaim only if needed, but avoid relying on writable app filesystem

OpenShift-specific requirements:

- Container runs as arbitrary non-root UID.
- No privileged mode.
- No root-owned runtime write paths.
- Listen on configurable `PORT`.
- Health endpoints for readiness/liveness.
- Database migrations should be explicit, not surprising during every app boot unless we choose that deliberately.

## Proposed Repository Structure

```text
app/
  src/
    app/                    Next.js App Router pages and layouts
    components/
    features/
      study/
      cards/
      imports/
      auth/
      progress/
    lib/
      db/                   Prisma client singleton
      env/                  Environment variable validation (Zod)
      importer/             JSON parser, validator, import service
      scheduler/
      auth/
      media/
  prisma/
    schema.prisma
    migrations/
  scripts/
    import.ts               CLI: import a JSON question file into the database
  public/
  Dockerfile
  package.json

charts/
  ppl-flashcards/           Helm chart (Phase 10)
    Chart.yaml
    values.yaml
    templates/

data/
  questions/                JSON question files (output of scripts/md_to_json.ts)
    MET_126_175_*.json
    questions_airlaw.json
    ...

scripts/
  md_to_json.ts             One-off: convert Questions/*.md → data/questions/*.json

docker-compose.yml
docs/
Questions/                  Original Markdown question files (archived after migration)
references/
```

## Open Decisions

- Whether media storage grows beyond static `public/assets/` to object storage (MinIO / S3) for Phase 7.

## Implementation Progress

1. ~~Scaffold the Next.js TypeScript app.~~ ✓ Phase 0
2. ~~Add Docker Compose with PostgreSQL.~~ ✓ Phase 0
3. ~~Add Prisma schema and initial migration.~~ ✓ Phase 1
4. ~~Add seed script and bootstrap user.~~ ✓ Phase 1
5. ~~Build JSON importer (parser, validator, import service, CLI).~~ ✓ Phase 2
6. ~~Add minimal authentication (credentials login, sessions).~~ ✓ Phase 3
7. ~~Build the mobile study UI for multiple-choice and open-answer cards.~~ ✓ Phase 4
8. ~~Implement the first spaced repetition scheduler.~~ ✓ Phase 5
9. ~~Serve question images; add card flagging and notes.~~ ✓ Phase 5 patches
10. Add card browser, editor, create form, flagged review queue, and CardRevision history. ← Phase 6
11. Add full media management (upload UI, object storage). ← Phase 7
12. Add bulk import UI (JSON upload, preview, validation). ← Phase 8
13. Add initial Helm chart for OpenShift deployment. ← Phase 10
14. Add PWA manifest and mobile polish. ← Phase 9
