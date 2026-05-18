// Set the secret before any module that reads process.env.SESSION_SECRET
// is called. The codec reads it lazily (inside signSession/verifySession),
// so this assignment takes effect even though static imports are resolved
// first — the functions are only invoked after all top-level code has run.
process.env.SESSION_SECRET = "test-secret-for-unit-tests-at-least-32-chars";

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { signSession, verifySession } from "./codec";
import type { SessionPayload } from "./types";

function makePayload(overrides: Partial<SessionPayload> = {}): SessionPayload {
  const now = Math.floor(Date.now() / 1000);
  return {
    userId: "user-cuid-123",
    email: "test@example.com",
    role: "USER",
    passwordVersion: 1,
    iat: now,
    exp: now + 3600,
    ...overrides,
  };
}

describe("signSession", () => {
  it("produces a string with exactly one dot separator", () => {
    const token = signSession(makePayload());
    const dots = token.split(".").length - 1;
    assert.equal(dots, 1);
  });

  it("produces different tokens for different payloads", () => {
    const a = signSession(makePayload({ userId: "user-a" }));
    const b = signSession(makePayload({ userId: "user-b" }));
    assert.notEqual(a, b);
  });
});

describe("verifySession", () => {
  it("round-trips a valid payload correctly", () => {
    const payload = makePayload();
    const token = signSession(payload);
    const result = verifySession(token);
    assert.deepEqual(result, payload);
  });

  it("returns null when the signature is tampered", () => {
    const token = signSession(makePayload());
    const tampered = token.slice(0, -4) + "0000";
    assert.equal(verifySession(tampered), null);
  });

  it("returns null when the payload is tampered (signature mismatch)", () => {
    const token = signSession(makePayload());
    const lastDot = token.lastIndexOf(".");
    const sig = token.slice(lastDot);
    const fakePayload = Buffer.from(
      JSON.stringify({ userId: "hacker", email: "x@x.com", iat: 0, exp: 9999999999 }),
    ).toString("base64url");
    assert.equal(verifySession(`${fakePayload}${sig}`), null);
  });

  it("returns null for an expired payload", () => {
    const now = Math.floor(Date.now() / 1000);
    const payload = makePayload({ exp: now - 1 });
    const token = signSession(payload);
    assert.equal(verifySession(token), null);
  });

  it("returns null for undefined", () => {
    assert.equal(verifySession(undefined), null);
  });

  it("returns null for an empty string", () => {
    assert.equal(verifySession(""), null);
  });

  it("returns null for a string with no dot", () => {
    assert.equal(verifySession("nodothere"), null);
  });

  it("returns null for a string with only a dot", () => {
    assert.equal(verifySession("."), null);
  });
});
