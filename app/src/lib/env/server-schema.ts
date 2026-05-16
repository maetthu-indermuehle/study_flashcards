import { z } from "zod";

// Exported separately from server.ts so tests can import and exercise the
// schema without triggering the eager parse() call that requires a live
// DATABASE_URL at module load time.
export const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
});
