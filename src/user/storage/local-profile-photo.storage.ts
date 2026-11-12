import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Injectable } from '@nestjs/common';
import {
  AVATAR_KEY_PREFIX,
  avatarObjectKey,
  LOCAL_AVATAR_SERVE_ROOT,
  ProfilePhotoStorage,
} from './profile-photo-storage';
import { SupportedPhotoExtension } from './user-profile-photo.storage';

@Injectable()
export class LocalProfilePhotoStorage implements ProfilePhotoStorage {
  private readonly uploadsRoot: string;

  constructor(uploadsRoot = path.resolve(process.cwd(), 'public', 'uploads', 'avatars')) {
    this.uploadsRoot = uploadsRoot;
  }

  async save(userId: string, buffer: Buffer, extension: SupportedPhotoExtension): Promise<string> {
    const key = avatarObjectKey(userId, extension);
    const target = path.join(this.uploadsRoot, key.slice(AVATAR_KEY_PREFIX.length));

    await mkdir(this.uploadsRoot, { recursive: true });
    await writeFile(target, buffer, { flag: 'wx' });

    return key;
  }

  async delete(url: string): Promise<void> {
    const legacyPrefix = `${LOCAL_AVATAR_SERVE_ROOT}/`;
    const fileName = url.startsWith(AVATAR_KEY_PREFIX)
      ? url.slice(AVATAR_KEY_PREFIX.length)
      : url.startsWith(legacyPrefix)
        ? path.basename(url)
        : undefined;
    if (!fileName) return;

    await rm(path.join(this.uploadsRoot, fileName), { force: true });
  }
}
