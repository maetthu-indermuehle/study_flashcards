/**
 * @module auth/password
 * Password hashing and verification using Node's built-in scrypt.
 *
 * Stored format: `<64-byte hex hash>.<hex salt>`.
 * Both hash and salt are hex-encoded; the hash is derived with
 * `crypto.scrypt(password, salt, 64)`.
 *
 * This module is the single place where this format is produced and
 * consumed. The seed script delegates to `hashPassword` here.
 */

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { MIN_PASSWORD_LENGTH } from "./constants";

export { MIN_PASSWORD_LENGTH };

const scryptAsync = promisify(scrypt);

/**
 * Hashes a plaintext password using scrypt with a random 16-byte salt.
 *
 * @param plain - The plaintext password (must be ≥ MIN_PASSWORD_LENGTH chars).
 * @returns A `<hex hash>.<hex salt>` string suitable for storage.
 */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(plain, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

/**
 * Verifies a plaintext password against a stored `<hash>.<salt>` string.
 *
 * Returns `false` for any malformed input rather than throwing, so callers
 * can treat all failure modes uniformly as "wrong password".
 *
 * @param plain  - The plaintext password to verify.
 * @param stored - The stored hash in `<hex hash>.<hex salt>` format.
 * @returns `true` if the password matches, `false` otherwise.
 */
export async function verifyPassword(
  plain: string,
  stored: string,
): Promise<boolean> {
  if (!plain || !stored) return false;

  const dotIndex = stored.indexOf(".");
  if (dotIndex === -1) return false;

  const hash = stored.slice(0, dotIndex);
  const salt = stored.slice(dotIndex + 1);
  if (!hash || !salt) return false;

  try {
    const derived = (await scryptAsync(plain, salt, 64)) as Buffer;
    const storedBuf = Buffer.from(hash, "hex");
    // Lengths must match before timingSafeEqual or it throws.
    if (derived.length !== storedBuf.length) return false;
    return timingSafeEqual(derived, storedBuf);
  } catch {
    return false;
  }
}
