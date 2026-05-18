import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword, MIN_PASSWORD_LENGTH } from "./password";

describe("hashPassword", () => {
  it("produces a <hash>.<salt> string", async () => {
    const result = await hashPassword("correct-horse-battery");
    assert.ok(result.includes("."), "format must include a dot separator");
    const [hash, salt] = result.split(".");
    assert.ok(hash.length > 0);
    assert.ok(salt.length > 0);
  });

  it("produces a different hash each call due to random salt", async () => {
    const a = await hashPassword("same-password-1234");
    const b = await hashPassword("same-password-1234");
    assert.notEqual(a, b);
  });
});

describe("verifyPassword", () => {
  it("returns true for a correct password", async () => {
    const stored = await hashPassword("correct-horse-battery-staple");
    assert.equal(await verifyPassword("correct-horse-battery-staple", stored), true);
  });

  it("returns false for a wrong password", async () => {
    const stored = await hashPassword("correct-horse-battery-staple");
    assert.equal(await verifyPassword("wrong-password", stored), false);
  });

  it("returns false for an empty plaintext password", async () => {
    const stored = await hashPassword("some-password");
    assert.equal(await verifyPassword("", stored), false);
  });

  it("returns false for an empty stored hash", async () => {
    assert.equal(await verifyPassword("password", ""), false);
  });

  it("returns false for a stored hash with no dot separator", async () => {
    assert.equal(await verifyPassword("password", "nodothere"), false);
  });

  it("returns false for a stored hash with invalid hex", async () => {
    assert.equal(await verifyPassword("password", "not-valid-hex.not-valid-salt"), false);
  });

  it("is case-sensitive", async () => {
    const stored = await hashPassword("Password123");
    assert.equal(await verifyPassword("password123", stored), false);
  });
});

describe("MIN_PASSWORD_LENGTH", () => {
  it("is at least 10", () => {
    assert.ok(MIN_PASSWORD_LENGTH >= 10);
  });
});
