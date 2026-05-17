# PPL Study Flashcards

Mobile-first flashcard app for studying Canadian PPL groundschool material.

## Current Status

**Phase 2 in progress** — branch: `phase-2-json-importer`

- Phase 0 (project setup) and Phase 1 (database schema, migration, seed) are complete and merged to `main`.
- Phase 2 is in progress: format spec ✓, JSON parser ✓, validator ✓, import service ✓, CLI ✓ — smoke test remaining.

See [docs/project_status.md](docs/project_status.md) for a full breakdown of completed work and next steps.

## Documentation

| Document | Purpose |
|----------|---------|
| [docs/product_vision.md](docs/product_vision.md) | What this app is and why |
| [docs/app_architecture_plan.md](docs/app_architecture_plan.md) | Stack, deployment, domain model overview |
| [docs/core_domain_model.md](docs/core_domain_model.md) | ER diagram of database entities |
| [docs/implementation_plan.md](docs/implementation_plan.md) | Phase-by-phase build roadmap |
| [docs/project_status.md](docs/project_status.md) | Living status doc — current phase, next steps |
| [docs/project_guidelines.md](docs/project_guidelines.md) | Development conventions |
| [docs/question_generation_guide.md](docs/question_generation_guide.md) | JSON question format spec + LLM prompt |
| [docs/phase_2_plan.md](docs/phase_2_plan.md) | Detailed Phase 2 implementation plan |

## Local Development

Docker Compose is the primary development workflow. Do not use `npm run dev` directly.

Run the full stack (app + PostgreSQL):

```bash
docker compose up
```

Or rebuild the image first:

```bash
docker compose up --build
```

On first start, the container automatically:
1. Installs/updates npm dependencies
2. Runs pending Prisma migrations
3. Seeds the default user (`admin@local.dev` / `localdev`) and "Canadian PPL" deck
4. Starts the Next.js dev server on http://localhost:3000

Stop cleanly with `Ctrl-C` or:

```bash
docker compose down
```

## Useful URLs

| URL | What it is |
|-----|-----------|
| http://localhost:3000 | App home page |
| http://localhost:3000/api/health | Health endpoint |

## App Commands

Run from the `app/` directory (for CI, typecheck, and lint — not for running the dev server):

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Database

The Phase 1 schema is live with 13 models and 11 enums. Migrations run automatically on container startup via `npx prisma migrate deploy`.

To create a new migration during development:

```bash
docker compose exec app npx prisma migrate dev --name <migration-name>
```

To inspect the database:

```bash
docker compose exec db psql -U ppl_flashcards ppl_flashcards
```

## Importing Questions

The canonical question format is JSON — see [docs/question_generation_guide.md](docs/question_generation_guide.md) for the full spec and an LLM prompt for generating new questions.

Import a JSON question file (validate only):

```bash
docker compose exec app npx tsx scripts/import.ts path/to/questions.json --dry-run
```

Remove `--dry-run` to write to the database. Additional flags:

| Flag | Description |
|------|-------------|
| `--dry-run` | Parse and validate only; no database writes |
| `--force` | Import even when validation errors are present |
| `--verbose` | Print each card's sourceId as it is processed |
| `--deck <name>` | Target deck name (default: `Canadian PPL`) |
| `--user <email>` | Deck owner email (default: `SEED_USER_EMAIL` env var) |
