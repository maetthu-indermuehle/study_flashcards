# PPL Flashcards App

This is the Next.js application for the Canadian PPL flashcard project. The app
is intentionally placed in `app/` so the existing question/reference material
can live beside it during the transition from Markdown files to the database.

## Getting Started

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

The health endpoint is available at
[http://localhost:3000/api/health](http://localhost:3000/api/health).

## Docker Compose

From the repository root:

```bash
docker compose up --build
```

This starts the app and a local PostgreSQL database.

## Environment

See `.env.example` for the local database URL and port values.

## Phase 0 Scope

This phase sets up the app foundation only. The Prisma domain models and first
real migration will be added in Phase 1.
