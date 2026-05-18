/**
 * Unit tests for the role hierarchy in lib/auth/permissions.
 *
 * The `requireRole` function itself requires a live DB session and is covered
 * by integration tests. `hasRole` is a pure function and fully tested here.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hasRole } from "./permissions";
import type { UserRole } from "@/lib/session/types";

describe("hasRole", () => {
  const roles: UserRole[] = ["USER", "EDITOR", "ADMIN"];

  // Every role satisfies itself.
  for (const role of roles) {
    it(`${role} satisfies ${role}`, () => {
      assert.ok(hasRole(role, role));
    });
  }

  // Higher roles satisfy lower requirements.
  it("EDITOR satisfies USER", () => {
    assert.ok(hasRole("EDITOR", "USER"));
  });

  it("ADMIN satisfies USER", () => {
    assert.ok(hasRole("ADMIN", "USER"));
  });

  it("ADMIN satisfies EDITOR", () => {
    assert.ok(hasRole("ADMIN", "EDITOR"));
  });

  // Lower roles do NOT satisfy higher requirements.
  it("USER does not satisfy EDITOR", () => {
    assert.ok(!hasRole("USER", "EDITOR"));
  });

  it("USER does not satisfy ADMIN", () => {
    assert.ok(!hasRole("USER", "ADMIN"));
  });

  it("EDITOR does not satisfy ADMIN", () => {
    assert.ok(!hasRole("EDITOR", "ADMIN"));
  });
});
