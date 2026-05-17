/**
 * @module env/server-schema
 * Zod schema for server-side environment variables.
 *
 * Exported separately from `server.ts` so tests can import and exercise the
 * schema without triggering the eager `parse()` call in `server.ts`, which
 * requires a valid `DATABASE_URL` at module load time.
 */

import { z } from "zod";

/**
 * Zod schema describing every environment variable the server requires.
 *
 * - `DATABASE_URL` — PostgreSQL connection string; must be a valid URL.
 * - `NODE_ENV` — runtime environment; defaults to `"development"`.
 * - `PORT` — HTTP port the Next.js server listens on; coerced from string
 *   (as `process.env` values always are) and defaults to `3000`.
 *   In production/OpenShift this is set via the `PORT` env var so the
 *   container port is configurable without rebuilding the image.
 * - `SESSION_SECRET` — secret used to sign session cookies; must be at least
 *   32 characters. Generate with: `openssl rand -base64 32`
 * - `SESSION_MAX_AGE_SECONDS` — session lifetime in seconds; defaults to
 *   604800 (7 days). Coerced from string since env values are always strings.
 */
export const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  SESSION_SECRET: z.string().min(32),
  SESSION_MAX_AGE_SECONDS: z.coerce.number().int().positive().default(7 * 24 * 60 * 60),
});
