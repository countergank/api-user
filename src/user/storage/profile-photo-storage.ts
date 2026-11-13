import { SupportedPhotoExtension } from './user-profile-photo.storage';

export const PROFILE_PHOTO_STORAGE = Symbol('PROFILE_PHOTO_STORAGE');

export interface ProfilePhotoStorage {
  save(userId: string, buffer: Buffer, extension: SupportedPhotoExtension): Promise<string>;
  delete(url: string): Promise<void>;
}

export const AVATAR_KEY_PREFIX = 'avatar/';
export const LOCAL_AVATAR_SERVE_ROOT = '/uploads/avatars';

/**
 * Basenames the driver itself generates; anything else is never trusted. The
 * userId segment excludes separators and whitespace so a crafted stored value
 * can never reformat itself into a matching basename (R3-1).
 */
export const AVATAR_BASENAME_PATTERN = /^[A-Za-z0-9_-]+-\d+\.(?:jpg|png|webp)$/;

/** True only for values this module would have produced as object keys. */
export function isAvatarObjectKey(value: string): boolean {
  return (
    value.startsWith(AVATAR_KEY_PREFIX) &&
    AVATAR_BASENAME_PATTERN.test(value.slice(AVATAR_KEY_PREFIX.length))
  );
}

/** `STORAGE_PUBLIC_URL` must be an absolute http(s) origin; anything else is ignored. */
export function isValidPublicBaseUrl(base: string): boolean {
  return /^https?:\/\/\S+$/i.test(base);
}

export function avatarObjectKey(userId: string, extension: SupportedPhotoExtension): string {
  return `${AVATAR_KEY_PREFIX}${userId}-${Date.now()}.${extension}`;
}

/**
 * Stored values are object keys (`avatar/...`) since #546; values that start
 * with `/` are URLs persisted by earlier versions and pass through untouched.
 * Unexpected stored values resolve to `undefined` — the frontend renders the
 * same empty-avatar state as a user without a photo, which is the safest
 * outcome. With STORAGE_PUBLIC_URL set the result becomes absolute: for the
 * local driver the base is the API origin serving `/uploads/avatars/...`, for
 * the s3 driver it is the public bucket base that keys resolve under. An
 * invalid base is ignored and the local fallback applies.
 */
export function resolveProfilePhotoPublicUrl(
  storedValue: string | undefined,
  storagePublicUrl?: string,
  driver = 'local',
): string | undefined {
  if (!storedValue) return undefined;
  if (storedValue.startsWith('/')) return storedValue;
  if (!isAvatarObjectKey(storedValue)) return undefined;
  if (driver === 's3') {
    return isValidPublicBaseUrl(storagePublicUrl ?? '')
      ? joinPublicBase(storagePublicUrl, storedValue)
      : undefined;
  }
  const servedPath = `${LOCAL_AVATAR_SERVE_ROOT}/${storedValue.slice(AVATAR_KEY_PREFIX.length)}`;
  return isValidPublicBaseUrl(storagePublicUrl ?? '')
    ? joinPublicBase(storagePublicUrl, servedPath)
    : servedPath;
}

function joinPublicBase(base: string | undefined, pathValue: string): string {
  if (!base) return pathValue;
  return `${base.replace(/\/+$/, '')}/${pathValue.replace(/^\/+/, '')}`;
}

/**
 * Flattens driver error text before it reaches the logger: control characters
 * and newlines become single spaces so a hostile driver message cannot forge
 * log lines, and the result is capped to keep entries readable.
 */
export function sanitizeLogValue(value: string, maxLength = 200): string {
  const withoutAnsi = value.replace(/\u001b\[[0-9;]*[A-Za-z]/g, '');
  const flattened = withoutAnsi.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim();
  return flattened.length > maxLength ? `${flattened.slice(0, maxLength)}...` : flattened;
}

export const PHOTO_CONTENT_TYPE_BY_EXTENSION: Record<SupportedPhotoExtension, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};
