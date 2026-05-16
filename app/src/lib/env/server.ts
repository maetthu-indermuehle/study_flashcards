import { serverEnvSchema } from "./server-schema";

// Centralizing environment parsing gives us one documented place to explain
// which variables are required on local Docker, CI, and OpenShift.
export const serverEnv = serverEnvSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
});
