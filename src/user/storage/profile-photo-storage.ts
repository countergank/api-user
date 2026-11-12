import { SupportedPhotoExtension } from './user-profile-photo.storage';

export const PROFILE_PHOTO_STORAGE = Symbol('PROFILE_PHOTO_STORAGE');

export interface ProfilePhotoStorage {
  save(userId: string, buffer: Buffer, extension: SupportedPhotoExtension): Promise<string>;
  delete(url: string): Promise<void>;
}

export const AVATAR_KEY_PREFIX = 'avatar/';
export const LOCAL_AVATAR_SERVE_ROOT = '/uploads/avatars';

export function avatarObjectKey(userId: string, extension: SupportedPhotoExtension): string {
  return `${AVATAR_KEY_PREFIX}${userId}-${Date.now()}.${extension}`;
}

/**
 * Stored values are object keys (`avatar/...`) since #546; values that start
 * with `/` are URLs persisted by earlier versions and pass through untouched.
 * With STORAGE_PUBLIC_URL set the result becomes absolute: for the local
 * driver the base is the API origin serving `/uploads/avatars/...`, for the
 * s3 driver it is the public bucket base that keys resolve under.
 */
export function resolveProfilePhotoPublicUrl(
  storedValue: string | undefined,
  storagePublicUrl?: string,
  driver = 'local',
): string | undefined {
  if (!storedValue) return undefined;
  if (storedValue.startsWith('/')) return storedValue;
  if (driver === 's3') {
    return joinPublicBase(storagePublicUrl, storedValue);
  }
  return joinPublicBase(
    storagePublicUrl,
    `${LOCAL_AVATAR_SERVE_ROOT}/${storedValue.slice(AVATAR_KEY_PREFIX.length)}`,
  );
}

function joinPublicBase(base: string | undefined, pathValue: string): string {
  if (!base) return pathValue;
  return `${base.replace(/\/+$/, '')}/${pathValue.replace(/^\/+/, '')}`;
}

export const PHOTO_CONTENT_TYPE_BY_EXTENSION: Record<SupportedPhotoExtension, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};
