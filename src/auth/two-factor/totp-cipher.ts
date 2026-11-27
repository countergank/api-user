import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

/**
 * AES-256-GCM envelope for the TOTP secret (#566, S2).
 *
 * Format: `v1:<iv b64>:<auth tag b64>:<ciphertext b64>`. The version prefix
 * lets a future key rotation migrate old payloads instead of failing them.
 * The scrypt salt is fixed per purpose: uniqueness comes from the random IV,
 * and the ENCRYPTION_PASSWORD stays the only secret.
 */
const ALGORITHM = 'aes-256-gcm';
const SCRYPT_SALT = 'api-user:totp';
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const PAYLOAD_VERSION = 'v1';

function deriveKey(password: string): Buffer {
  return scryptSync(password, SCRYPT_SALT, KEY_LENGTH);
}

export function encryptTotpSecret(plaintext: string, password: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, deriveKey(password), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    PAYLOAD_VERSION,
    iv.toString('base64'),
    tag.toString('base64'),
    ciphertext.toString('base64'),
  ].join(':');
}

export function decryptTotpSecret(payload: string, password: string): string {
  const parts = payload.split(':');
  if (parts.length !== 4 || parts[0] !== PAYLOAD_VERSION) {
    throw new Error('Malformed TOTP secret payload');
  }
  const [, ivB64, tagB64, dataB64] = parts;
  const decipher = createDecipheriv(ALGORITHM, deriveKey(password), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString(
    'utf8',
  );
}
