# Project Guidelines and Best Practices

This document defines the general engineering rules for the PPL flashcard app. It should be updated as the project matures.

## Goals

The project should stay:

- understandable,
- maintainable,
- mobile-first,
- easy to deploy,
- easy to extend,
- safe to refactor,
- well documented.

Good engineering discipline matters here because the app will manage study content, user progress, imports, media, and eventually production deployments.

## Versioning

Use semantic versioning.

Format:

```text
MAJOR.MINOR.PATCH
```

Meaning:

- `MAJOR`: incompatible changes, large migrations, or breaking deployment/data changes.
- `MINOR`: new backward-compatible features.
- `PATCH`: bug fixes, small improvements, documentation updates, or internal refactors that do not change behaviour.

Before the first stable release, use `0.x.y` versions:

- `0.1.0`: first usable local study prototype.
- `0.2.0`: imported deck plus basic spaced repetition.
- `0.3.0`: card editing and import UI.
- `1.0.0`: first production-ready personal release.

Version changes should be reflected in:

- `package.json` once the app exists,
- `CHANGELOG.md`,
- release notes when GitHub releases are used.

## Changelog

Maintain a `CHANGELOG.md` once application development starts.

Use a simple Keep a Changelog style:

```text
## [Unreleased]

### Added
### Changed
### Fixed
### Removed
### Security
```

Rules:

- Every user-visible change should be listed.
- Database migrations should be mentioned.
- Import format changes should be mentioned.
- Deployment changes should be mentioned.
- Breaking changes should be clearly called out.

The changelog should be updated during the work, not reconstructed only at release time.

## README

The root `README.md` must stay current.

It should eventually include:

- what the app is,
- current status,
- prerequisites,
- local development setup,
- Docker Compose instructions,
- database migration instructions,
- import instructions,
- test commands,
- deployment overview,
- links to planning docs.

When commands change, the README should change in the same pull request or commit.

## Documentation

Planning and architecture docs live in `docs/`.

Current docs:

- `docs/product_vision.md`
- `docs/app_architecture_plan.md`
- `docs/core_domain_model.md`
- `docs/implementation_plan.md`
- `docs/project_guidelines.md`

Documentation should be treated as part of the product. If we make a meaningful architectural decision, add or update a document.

This project should prefer more documentation over less. The app is also a learning project for understanding Next.js, full-stack TypeScript, Prisma, Docker, and OpenShift deployment. When a pattern, framework convention, or architectural choice may not be obvious to someone new to Next.js, explain it in the relevant document or close to the code.

## Comments

Code should be understandable to a future reader who did not write it.

For this project, prefer more helpful comments rather than fewer. The goal is not only to build the app, but also to make the codebase useful for learning how the app works. Comments should explain intent, framework-specific patterns, and non-obvious decisions without becoming noisy line-by-line narration.

Prefer:

- clear names,
- small functions,
- explicit types,
- simple control flow,
- comments that explain why something exists.

Avoid:

- comments that restate obvious code,
- long undocumented cleverness,
- hidden behaviour inside generic helper functions,
- business rules that exist only in a developer's memory.

Comment when:

- the spaced repetition scheduler makes a non-obvious decision,
- an importer handles a tricky Markdown edge case,
- OpenShift deployment needs a specific workaround,
- security-sensitive logic is involved,
- media/source attribution behaviour is subtle,
- a tradeoff was chosen deliberately.
- a Next.js pattern is being used that may be unfamiliar, such as Server Components, Client Components, Server Actions, route handlers, loading states, error boundaries, caching, or metadata.
- a Prisma or database pattern affects data integrity, migrations, relations, or query performance.
- a Docker, Helm, or OpenShift choice is required for deployment rather than local convenience.

## Code Structure

Keep files focused and reasonably short.

Guidelines:

- Prefer feature modules over large catch-all folders.
- Keep components small and focused.
- Split files when they mix unrelated responsibilities.
- Extract repeated business logic into shared functions.
- Extract repeated UI patterns into reusable components.
- Keep route/page files thin when possible.
- Keep database access and domain logic out of visual components.

As a rough guideline, a component or module that grows beyond about 200-300 lines should be reviewed for splitting. This is not a hard limit, but it is a smell.

## Proposed App Structure

The exact structure can evolve, but the app should start close to this:

```text
app/
  src/
    app/
      (auth)/
      (dashboard)/
      study/
      api/
    components/
      ui/
      layout/
    features/
      auth/
      cards/
      imports/
      media/
      progress/
      study/
    lib/
      auth/
      db/
      env/
      importers/
      scheduler/
      validation/
    types/
    constants/
  prisma/
  public/
```

Rules:

- `src/app/` contains routing, layouts, loading states, error states, and route-specific composition.
- `src/components/ui/` contains generic reusable UI elements.
- `src/features/` contains domain-specific UI and logic.
- `src/lib/` contains framework-independent helpers, database access, scheduler logic, validation, and importers.
- `prisma/` contains schema, migrations, and seed scripts.

## Next.js Practices

Follow current Next.js App Router practices.

Guidelines:

- Use Server Components by default.
- Use Client Components only when browser APIs, interactivity, or React hooks are required.
- Keep `use client` boundaries small.
- Use route-level `loading.tsx` and `error.tsx` where useful.
- Colocate data loading near the route or server component that needs it.
- Move reusable data access into service/query functions.
- Validate inputs on the server.
- Do not trust client-side validation alone.
- Use Next.js image handling where it fits media requirements.
- Avoid unnecessary client-side state when server-rendered data is enough.
- Keep route handlers focused and typed.
- Keep server-only code out of client bundles.

The referenced Next.js clean-code article highlights several useful themes that this project should follow: organized project structure, small focused components, Server Components by default, colocated data fetching, dedicated service functions, strong TypeScript types, error/loading states, custom hooks for reusable client behaviour, environment validation, image optimization, tests, lint/format tooling, naming conventions, and comments for complex logic.

Reference:

- Next.js clean-code article: https://dev.to/sizan_mahmud0_e7c3fd0cb68/nextjs-clean-code-best-practices-for-scalable-applications-2jmc

## TypeScript

Use TypeScript strictly.

Guidelines:

- Avoid `any` unless there is a clear reason.
- Prefer explicit domain types for cards, reviews, imports, and scheduler inputs.
- Validate unknown external input with schemas before using it.
- Keep generated Prisma types at the database boundary; map to domain types where helpful.
- Use discriminated unions for card types, review ratings, import states, and media roles.

Examples of useful unions:

```ts
type CardType = 'multiple_choice' | 'open_answer';
type ReviewRating = 'wrong' | 'hard' | 'good' | 'easy';
type ImportStatus = 'draft' | 'validated' | 'imported' | 'failed';
```

## Database and Migrations

Database changes must be deliberate.

Guidelines:

- Use Prisma migrations.
- Review generated migrations before committing.
- Avoid destructive migrations without a plan.
- Keep review history append-only.
- Be careful with user progress data.
- Seed data should be repeatable.
- Import scripts should be idempotent where practical.

When changing the schema, update:

- Prisma schema,
- migrations,
- seed/import scripts,
- domain model docs if the change is significant,
- tests.

## Imports and Data Quality

The importer is critical because it turns study content into application data.

Guidelines:

- Validate imported cards before saving.
- Preserve original question IDs when available.
- Preserve source references.
- Preserve asset references.
- Detect duplicate question text where practical.
- Report import warnings clearly.
- Never silently drop choices, answers, explanations, references, or assets.
- Store import metadata in `ImportBatch`.

## Spaced Repetition

Keep scheduler logic isolated.

Guidelines:

- Scheduler code should live in a dedicated module.
- Scheduler functions should be deterministic and easy to test.
- Review history should be immutable.
- `CardProgress` should store current scheduling state.
- Add tests for interval changes, lapses, and edge cases.
- Document algorithm choices and rating mappings.

This makes it possible to replace a simple SM-2-like scheduler with FSRS or another model later.

## Testing

Testing should focus on risk.

Priorities:

- Markdown importer parsing and validation.
- Spaced repetition scheduler.
- Database queries that select due cards.
- Auth/session boundaries.
- Card editing and import flows.
- Study flow behaviour.

Recommended test layers:

- unit tests for pure logic,
- integration tests for database-backed flows,
- end-to-end tests for the main study session once the UI exists.

Do not chase perfect coverage early, but protect the parts that can corrupt data or break studying.

## UI and Accessibility

The app is mobile-first.

Guidelines:

- Design for thumb use.
- Keep study screens focused.
- Use clear touch targets.
- Avoid dense desktop-first layouts.
- Make explanations readable on a phone.
- Support keyboard navigation where practical.
- Provide alt text for media.
- Preserve enough contrast for outdoor/mobile use.
- Keep loading and empty states friendly and clear.

The first screen of the app should be useful for studying, not a marketing page.

## Security

Security matters even for a personal app.

Guidelines:

- Store passwords only as secure hashes.
- Keep secrets in environment variables or OpenShift secrets.
- Never expose private env vars to the browser.
- Validate all server inputs.
- Check authorization on every user-owned resource.
- Avoid logging sensitive data.
- Treat uploaded/imported content carefully.
- Keep dependencies updated.

## Deployment

Deployment must work with OpenShift restrictions.

Guidelines:

- Container must not require privileged mode.
- Container must run as an arbitrary non-root UID.
- App must listen on configurable `PORT`.
- Do not rely on writing to the app directory at runtime.
- Use readiness and liveness endpoints.
- Use ConfigMaps and Secrets for configuration.
- Run migrations deliberately, preferably as a job.
- Keep production Docker images small and reproducible.

## Git Practices

Commits should be meaningful and focused.

Guidelines:

- Use clear commit messages.
- Group related changes together.
- Avoid mixing unrelated refactors with feature work.
- Mention migrations and data changes in commit messages.
- Keep generated files out of git unless they are intentionally part of the project.
- Use Git LFS for large binary assets such as PDFs.

## Dependency Practices

Dependencies should earn their place.

Guidelines:

- Prefer established libraries for hard problems.
- Avoid adding packages for tiny utilities.
- Check maintenance and compatibility before adding dependencies.
- Keep frontend bundle size in mind.
- Document major library choices in architecture docs.

## Refactoring

Refactor continuously, but keep refactors scoped.

Guidelines:

- Refactor when files become hard to understand.
- Extract repeated logic after the pattern is clear.
- Keep public interfaces stable unless there is a reason to change them.
- Add tests before risky refactors.
- Avoid large unrelated rewrites during feature work.

## Definition of Done

A change is done when:

- it works locally,
- relevant tests/checks pass,
- code is typed and lint-clean,
- user-facing behaviour is documented if needed,
- README/changelog/docs are updated if affected,
- migrations are included if schema changed,
- the implementation is understandable to a future reader.
