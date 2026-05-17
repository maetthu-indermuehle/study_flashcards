/**
 * @module env/server
 * Validated server-side environment variables.
 *
 * Import `serverEnv` anywhere server-side code needs an environment variable.
 * Centralising the parse call here means all missing or malformed variables
 * are caught at startup with a clear Zod error rather than failing silently
 * with `undefined` somewhere deeper in the app.
 *
 * The exported `serverEnv` object is a lazy proxy — env vars are parsed on
 * first property access rather than at module load time. This lets `next build`
 * import the module without `DATABASE_URL` or `SESSION_SECRET` being set (they
 * are not available inside the Docker builder stage), while still failing fast
 * at request time if a variable is missing or invalid.
 *
 * @example
 * ```ts
 * import { serverEnv } from "@/lib/env/server";
 * const client = new Pool({ connectionString: serverEnv.DATABASE_URL });
 * ```
 */

import { serverEnvSchema } from "./server-schema";

type ServerEnv = ReturnType<typeof serverEnvSchema.parse>;

let _cached: ServerEnv | undefined;

function getEnv(): ServerEnv {
  if (!_cached) {
    _cached = serverEnvSchema.parse({
      DATABASE_URL: process.env.DATABASE_URL,
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      SESSION_SECRET: process.env.SESSION_SECRET,
      SESSION_MAX_AGE_SECONDS: process.env.SESSION_MAX_AGE_SECONDS,
    });
  }
  return _cached;
}

/**
 * Parsed and validated server environment variables.
 *
 * Throws a `ZodError` on first property access if any required variable is
 * missing or fails validation. Validated once and cached for subsequent reads.
 *
 * Available fields: `DATABASE_URL`, `NODE_ENV`, `PORT`, `SESSION_SECRET`,
 * `SESSION_MAX_AGE_SECONDS`. See {@link serverEnvSchema} for the full schema.
 */
export const serverEnv = new Proxy({} as ServerEnv, {
  get(_target, prop: string) {
    return getEnv()[prop as keyof ServerEnv];
  },
});
