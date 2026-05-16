# Changelog

All notable changes to this project will be documented in this file.

This project uses semantic versioning.

## [Unreleased]

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

