# PPL Study Flashcards

Mobile-first flashcard app for studying Canadian PPL groundschool material.

The repository currently contains the source question material, architecture
docs, and the Phase 0 Next.js application scaffold.

## Current Status

Active branch: `phase-0-project-setup`

Phase 0 provides:

- Next.js App Router with TypeScript
- Tailwind CSS
- Prisma installed and configured for PostgreSQL
- local PostgreSQL through Docker Compose
- health endpoint at `/api/health`
- OpenShift-conscious production Dockerfile

## Documentation

- [Product vision](docs/product_vision.md)
- [Architecture plan](docs/app_architecture_plan.md)
- [Core domain model](docs/core_domain_model.md)
- [Implementation plan](docs/implementation_plan.md)
- [Project guidelines](docs/project_guidelines.md)

## Local Development

Copy the example environment file if you want to run the app outside Docker:

```bash
cp app/.env.example app/.env
```

Run the app and PostgreSQL with Docker Compose:

```bash
docker compose up --build
```

Then open:

```text
http://localhost:3000
```

Health check:

```text
http://localhost:3000/api/health
```

## App Commands

Run from the `app/` directory:

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
npm run test
```

## Database

Phase 0 only initializes Prisma and PostgreSQL connectivity. Phase 1 will add
the application schema and the first migration.

Prisma commands are available from `app/`:

```bash
npm run prisma:generate
npm run prisma:migrate
```
