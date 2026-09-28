import bcrypt from "bcryptjs";

const BCRYPT_COST = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * When the submitted email doesn't match any admin, still run a bcrypt
 * comparison against a dummy hash before returning "invalid credentials".
 * Without this, a login endpoint responds measurably faster for unknown
 * emails than for known ones with a wrong password, letting an attacker
 * enumerate valid admin emails purely from response timing.
 */
const DUMMY_HASH =
  "$2a$12$C6UzMDM.H6dfI/f/IKcEeO4pO7DhCcT9AmOO.eZlWQiv3aRAxOdWa";

export function burnPasswordCheck(): Promise<boolean> {
  return bcrypt.compare("no-such-password", DUMMY_HASH);
}
