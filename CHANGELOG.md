# Changelog

All notable changes to this project will be documented in this file.

This project uses semantic versioning.

## [Unreleased]

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

### Changed

- `docs/app_architecture_plan.md`: import strategy updated to JSON-only; repo structure,
  progress checklist, and open decisions refreshed.
- `docs/core_domain_model.md`: diagram updated to reflect live Prisma schema (`Card.importBatchId`,
  `Card.originalId`, `MediaAsset` field notes).
- `README.md`: current status, documentation table, Docker workflow, and import commands
  updated to reflect Phase 2 progress.

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

## [0.1.0] - 2026-05-16

### Added

- Next.js App Router application scaffold with TypeScript and Tailwind CSS.
- Prisma installed and initialized for PostgreSQL.
- Docker Compose setup for the app and local PostgreSQL.
- OpenShift-conscious production Dockerfile using Next.js standalone output.
- Health endpoint at `/api/health`.
- Initial README with local development commands and documentation links.

