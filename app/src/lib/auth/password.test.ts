import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { scrypt, randomBytes } from "node:crypto";
import { promisify } from "node:util";
import { verifyPassword } from "./password";

const scryptAsync = promisify(scrypt);

/** Produces a stored hash in the same format as the seed script. */
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

describe("verifyPassword", () => {
  it("returns true for a correct password", async () => {
    const stored = await hashPassword("correct-horse-battery-staple");
    const result = await verifyPassword("correct-horse-battery-staple", stored);
    assert.equal(result, true);
  });

  it("returns false for a wrong password", async () => {
    const stored = await hashPassword("correct-horse-battery-staple");
    const result = await verifyPassword("wrong-password", stored);
    assert.equal(result, false);
  });

  it("returns false for an empty plaintext password", async () => {
    const stored = await hashPassword("some-password");
    const result = await verifyPassword("", stored);
    assert.equal(result, false);
  });

  it("returns false for an empty stored hash", async () => {
    const result = await verifyPassword("password", "");
    assert.equal(result, false);
  });

  it("returns false for a stored hash with no dot separator", async () => {
    const result = await verifyPassword("password", "nodothere");
    assert.equal(result, false);
  });

  it("returns false for a stored hash with invalid hex", async () => {
    const result = await verifyPassword("password", "not-valid-hex.not-valid-salt");
    assert.equal(result, false);
  });

  it("is case-sensitive", async () => {
    const stored = await hashPassword("Password123");
    const result = await verifyPassword("password123", stored);
    assert.equal(result, false);
  });
});
