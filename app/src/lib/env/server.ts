/**
 * @module env/server
 * Validated server-side environment variables.
 *
 * Import `serverEnv` anywhere server-side code needs an environment variable.
 * Centralising the parse call here means all missing or malformed variables
 * are caught at startup with a clear Zod error rather than failing silently
 * with `undefined` somewhere deeper in the app.
 *
 * @example
 * ```ts
 * import { serverEnv } from "@/lib/env/server";
 * const client = new Pool({ connectionString: serverEnv.DATABASE_URL });
 * ```
 */

import { serverEnvSchema } from "./server-schema";

/**
 * Parsed and validated server environment variables.
 *
 * Throws a `ZodError` at module load time if any required variable is missing
 * or fails validation — this is intentional so the app fails fast rather than
 * serving requests with a broken configuration.
 *
 * Available fields: `DATABASE_URL`, `NODE_ENV`, `PORT`.
 * See {@link serverEnvSchema} for the full schema and defaults.
 */
export const serverEnv = serverEnvSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
});
