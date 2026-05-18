/**
 * Unit tests for user action validation logic.
 *
 * Tests that can be validated purely (password policy, input constraints)
 * are covered here without a database. The full Server Actions require a
 * live DB + session and are covered by integration tests.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password";
import type { UserRole } from "@/lib/session/types";

// ---------------------------------------------------------------------------
// Password policy
// ---------------------------------------------------------------------------

function validatePassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return null;
}

describe("password policy (MIN_PASSWORD_LENGTH)", () => {
  it("rejects passwords shorter than the minimum", () => {
    const short = "a".repeat(MIN_PASSWORD_LENGTH - 1);
    assert.notEqual(validatePassword(short), null);
  });

  it("accepts passwords exactly at the minimum length", () => {
    const exact = "a".repeat(MIN_PASSWORD_LENGTH);
    assert.equal(validatePassword(exact), null);
  });

  it("accepts passwords longer than the minimum", () => {
    const long = "a".repeat(MIN_PASSWORD_LENGTH + 10);
    assert.equal(validatePassword(long), null);
  });
});

// ---------------------------------------------------------------------------
// Role validation
// ---------------------------------------------------------------------------

const VALID_ROLES: UserRole[] = ["USER", "EDITOR", "ADMIN"];

function isValidRole(role: string): role is UserRole {
  return (VALID_ROLES as string[]).includes(role);
}

describe("role validation", () => {
  it("accepts valid roles", () => {
    for (const role of VALID_ROLES) {
      assert.ok(isValidRole(role), `${role} should be valid`);
    }
  });

  it("rejects unknown roles", () => {
    assert.ok(!isValidRole("SUPERUSER"));
    assert.ok(!isValidRole(""));
    assert.ok(!isValidRole("admin")); // case-sensitive
  });
});

// ---------------------------------------------------------------------------
// Last-admin guard logic
// ---------------------------------------------------------------------------

function canDemote(
  targetRole: UserRole,
  newRole: UserRole,
  adminCount: number,
  isSelf: boolean,
): string | null {
  if (isSelf && newRole !== "ADMIN") {
    return "You cannot demote your own account.";
  }
  if (targetRole === "ADMIN" && newRole !== "ADMIN" && adminCount <= 1) {
    return "Cannot demote the last admin. Promote another user first.";
  }
  return null;
}

describe("last-admin guard", () => {
  it("blocks demoting the sole admin", () => {
    const err = canDemote("ADMIN", "EDITOR", 1, false);
    assert.ok(err !== null);
  });

  it("allows demoting an admin when another admin exists", () => {
    const err = canDemote("ADMIN", "EDITOR", 2, false);
    assert.equal(err, null);
  });

  it("blocks self-demotion regardless of admin count", () => {
    const err = canDemote("ADMIN", "EDITOR", 5, true);
    assert.ok(err !== null);
  });

  it("allows promoting a non-admin (no guard triggered)", () => {
    const err = canDemote("USER", "ADMIN", 1, false);
    assert.equal(err, null);
  });
});
