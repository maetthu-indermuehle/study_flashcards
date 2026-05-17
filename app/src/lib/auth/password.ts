/**
 * @module auth/password
 * Password verification using Node's built-in scrypt.
 *
 * The stored format matches what the seed script produces in
 * `app/prisma/seed.ts`: `<64-byte hex hash>.<hex salt>`.
 * Both hash and salt are hex-encoded; the hash is derived with
 * `crypto.scrypt(password, salt, 64)`.
 */

import { scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

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
