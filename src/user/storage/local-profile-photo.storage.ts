import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Injectable } from '@nestjs/common';
import {
  AVATAR_BASENAME_PATTERN,
  AVATAR_KEY_PREFIX,
  avatarObjectKey,
  LOCAL_AVATAR_SERVE_ROOT,
  ProfilePhotoStorage,
} from './profile-photo-storage';
import { SupportedPhotoExtension } from './user-profile-photo.storage';

/** Writes the buffer to target; parameterized so tests can force failures. */
export type AvatarFileWriter = (target: string, buffer: Buffer) => Promise<void>;

const defaultWriter: AvatarFileWriter = (target, buffer) =>
  writeFile(target, buffer, { flag: 'wx' });

@Injectable()
export class LocalProfilePhotoStorage implements ProfilePhotoStorage {
  private readonly uploadsRoot: string;

  private readonly writer: AvatarFileWriter;

  constructor(
    uploadsRoot = path.resolve(process.cwd(), 'public', 'uploads', 'avatars'),
    writer: AvatarFileWriter = defaultWriter,
  ) {
    this.uploadsRoot = uploadsRoot;
    this.writer = writer;
  }

  async save(userId: string, buffer: Buffer, extension: SupportedPhotoExtension): Promise<string> {
    const key = avatarObjectKey(userId, extension);
    const fileName = key.slice(AVATAR_KEY_PREFIX.length);
    const target = path.join(this.uploadsRoot, fileName);

    await mkdir(this.uploadsRoot, { recursive: true });
    // 'wx' creates the file before writing, so a mid-write failure can leave a
    // partially written orphan behind. EEXIST is different: the write rejected
    // the create, so the existing file predates this save and must stay.
    try {
      await this.writer(target, buffer);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'EEXIST') {
        await rm(target, { force: true }).catch(() => undefined);
      }
      throw error;
    }

    return key;
  }

  async delete(url: string): Promise<void> {
    const legacyPrefix = `${LOCAL_AVATAR_SERVE_ROOT}/`;
    const fileName = url.startsWith(AVATAR_KEY_PREFIX)
      ? url.slice(AVATAR_KEY_PREFIX.length)
      : url.startsWith(legacyPrefix)
        ? path.basename(url)
        : undefined;
    if (!fileName || !AVATAR_BASENAME_PATTERN.test(fileName)) return;

    await rm(path.join(this.uploadsRoot, fileName), { force: true });
  }
}
