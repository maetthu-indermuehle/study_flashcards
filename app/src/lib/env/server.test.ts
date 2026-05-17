import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { serverEnvSchema } from "./server-schema";

const VALID_SECRET = "a-test-secret-that-is-at-least-32-characters-long";

describe("serverEnvSchema", () => {
  it("parses a fully specified valid environment", () => {
    const result = serverEnvSchema.parse({
      DATABASE_URL: "postgresql://user:pass@localhost:5432/mydb",
      NODE_ENV: "development",
      PORT: "3000",
      SESSION_SECRET: VALID_SECRET,
      SESSION_MAX_AGE_SECONDS: "604800",
    });
    assert.equal(result.DATABASE_URL, "postgresql://user:pass@localhost:5432/mydb");
    assert.equal(result.NODE_ENV, "development");
    assert.equal(result.PORT, 3000);
    assert.equal(result.SESSION_SECRET, VALID_SECRET);
    assert.equal(result.SESSION_MAX_AGE_SECONDS, 604800);
  });

  it("coerces PORT from string to number", () => {
    const result = serverEnvSchema.parse({
      DATABASE_URL: "postgresql://localhost/test",
      PORT: "8080",
      SESSION_SECRET: VALID_SECRET,
    });
    assert.equal(result.PORT, 8080);
    assert.strictEqual(typeof result.PORT, "number");
  });

  it("applies defaults for NODE_ENV, PORT, and SESSION_MAX_AGE_SECONDS when omitted", () => {
    const result = serverEnvSchema.parse({
      DATABASE_URL: "postgresql://localhost/test",
      SESSION_SECRET: VALID_SECRET,
    });
    assert.equal(result.NODE_ENV, "development");
    assert.equal(result.PORT, 3000);
    assert.equal(result.SESSION_MAX_AGE_SECONDS, 7 * 24 * 60 * 60);
  });

  it("rejects a missing DATABASE_URL", () => {
    assert.throws(() => serverEnvSchema.parse({ SESSION_SECRET: VALID_SECRET }));
  });

  it("rejects an invalid DATABASE_URL", () => {
    assert.throws(() =>
      serverEnvSchema.parse({
        DATABASE_URL: "not-a-valid-url",
        SESSION_SECRET: VALID_SECRET,
      })
    );
  });

  it("rejects an invalid NODE_ENV value", () => {
    assert.throws(() =>
      serverEnvSchema.parse({
        DATABASE_URL: "postgresql://localhost/test",
        NODE_ENV: "staging",
        SESSION_SECRET: VALID_SECRET,
      })
    );
  });

  it("rejects a SESSION_SECRET shorter than 32 characters", () => {
    assert.throws(() =>
      serverEnvSchema.parse({
        DATABASE_URL: "postgresql://localhost/test",
        SESSION_SECRET: "too-short",
      })
    );
  });

  it("coerces SESSION_MAX_AGE_SECONDS from string to number", () => {
    const result = serverEnvSchema.parse({
      DATABASE_URL: "postgresql://localhost/test",
      SESSION_SECRET: VALID_SECRET,
      SESSION_MAX_AGE_SECONDS: "86400",
    });
    assert.equal(result.SESSION_MAX_AGE_SECONDS, 86400);
    assert.strictEqual(typeof result.SESSION_MAX_AGE_SECONDS, "number");
  });
});
