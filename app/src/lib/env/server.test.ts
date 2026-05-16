import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { serverEnvSchema } from "./server-schema";

describe("serverEnvSchema", () => {
  it("parses a fully specified valid environment", () => {
    const result = serverEnvSchema.parse({
      DATABASE_URL: "postgresql://user:pass@localhost:5432/mydb",
      NODE_ENV: "development",
      PORT: "3000",
    });
    assert.equal(result.DATABASE_URL, "postgresql://user:pass@localhost:5432/mydb");
    assert.equal(result.NODE_ENV, "development");
    assert.equal(result.PORT, 3000);
  });

  it("coerces PORT from string to number", () => {
    const result = serverEnvSchema.parse({
      DATABASE_URL: "postgresql://localhost/test",
      PORT: "8080",
    });
    assert.equal(result.PORT, 8080);
    assert.strictEqual(typeof result.PORT, "number");
  });

  it("applies defaults for NODE_ENV and PORT when omitted", () => {
    const result = serverEnvSchema.parse({
      DATABASE_URL: "postgresql://localhost/test",
    });
    assert.equal(result.NODE_ENV, "development");
    assert.equal(result.PORT, 3000);
  });

  it("rejects a missing DATABASE_URL", () => {
    assert.throws(() => serverEnvSchema.parse({}));
  });

  it("rejects an invalid DATABASE_URL", () => {
    assert.throws(() =>
      serverEnvSchema.parse({ DATABASE_URL: "not-a-valid-url" })
    );
  });

  it("rejects an invalid NODE_ENV value", () => {
    assert.throws(() =>
      serverEnvSchema.parse({
        DATABASE_URL: "postgresql://localhost/test",
        NODE_ENV: "staging",
      })
    );
  });
});
