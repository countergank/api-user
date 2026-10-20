import { createHash, randomInt } from 'node:crypto';

/**
 * Identity-proof code policy for `POST /users/change-email` (S10, S11).
 *
 * The code is short on purpose — it has to be retyped from a mailbox — so the
 * real protection is the attempt budget and the expiry, not the entropy.
 */
export const EMAIL_CHANGE_CODE_LENGTH = 6;
export const EMAIL_CHANGE_CODE_TTL_MS = 10 * 60 * 1000;
export const EMAIL_CHANGE_CODE_MAX_ATTEMPTS = 5;
export const EMAIL_CHANGE_CODE_RESEND_INTERVAL_MS = 60 * 1000;

/** Revert window for the "it wasn't me" link sent to the previous address (S13). */
export const EMAIL_REVERT_WINDOW_MS = 72 * 60 * 60 * 1000;

/** Confirmation window of the existing token sent to the new address (S3). */
export const EMAIL_CHANGE_CONFIRMATION_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Six random digits from the CSPRNG. `randomInt` is uniform and cryptographically
 * secure, unlike `Math.random`, and leading zeros are preserved by `padStart`.
 */
export function generateEmailChangeCode(): string {
  return randomInt(0, 10 ** EMAIL_CHANGE_CODE_LENGTH)
    .toString()
    .padStart(EMAIL_CHANGE_CODE_LENGTH, '0');
}

/**
 * sha256 of the code salted with the user id (S2).
 *
 * The user id is the salt: it keeps two users that happen to draw the same code
 * from sharing a hash, and it stops an attacker holding a database dump from
 * matching a rainbow table against the six digits. The plaintext code never
 * reaches the document.
 */
export function hashEmailChangeCode(code: string, userId: string): string {
  return createHash('sha256').update(`${userId}:${code}`).digest('hex');
}

/** Constant-time-ish comparison is unnecessary: the hash is not a secret oracle. */
export function isEmailChangeCodeValid(code: string, userId: string, hash: string): boolean {
  return hashEmailChangeCode(code, userId) === hash;
}
