import { FileTypeResult, fromBuffer } from 'file-type';
import { mkdir, rm, writeFile } from 'fs/promises';
import path from 'path';
import { Injectable } from '@nestjs/common';

export interface ProfilePhotoFile {
  buffer: Buffer;
  size: number;
  mimetype: string;
  originalName?: string;
}

export const PROFILE_PHOTO_MAX_BYTES = 2 * 1024 * 1024;

const SUPPORTED_EXTENSIONS = ['jpg', 'png', 'webp'] as const;

export type SupportedPhotoExtension = (typeof SUPPORTED_EXTENSIONS)[number];
/**
 * The format decision comes from the file's magic bytes alone: a client can
 * label a GIF as `image/png`, so the declared mimetype is never trusted nor
 * required. A truncated or unreadable buffer cannot be proven safe and is
 * rejected instead of guessed.
 */
export async function detectPhotoExtension(
  file: Pick<ProfilePhotoFile, 'buffer'>,
): Promise<SupportedPhotoExtension | undefined> {
  let detected: FileTypeResult | undefined;
  try {
    detected = await fromBuffer(file.buffer);
  } catch {
    return undefined;
  }

  if (!detected) return undefined;

  return SUPPORTED_EXTENSIONS.find((extension) => extension === detected?.ext);
}

@Injectable()
export class UserProfilePhotoStorage {
  private readonly uploadsRoot: string;

  private readonly serveRoot: string;

  constructor() {
    // Served path is `/uploads/avatars/...`: `main.ts` mounts `@fastify/static`
    // on the uploads directory and derives this prefix from the same constant.
    this.serveRoot = '/uploads/avatars';
    this.uploadsRoot = path.resolve(process.cwd(), 'public', 'uploads', 'avatars');
  }

  /** Persists the buffer under a collision-free name and returns its URL. */
  async save(userId: string, buffer: Buffer, extension: SupportedPhotoExtension): Promise<string> {
    const fileName = `${userId}-${Date.now()}.${extension}`;
    const target = path.join(this.uploadsRoot, fileName);

    await mkdir(this.uploadsRoot, { recursive: true });
    await writeFile(target, buffer, { flag: 'wx' });

    return `${this.serveRoot}/${fileName}`;
  }

  /** Best effort removal; an already-missing file keeps the replacement flowing. */
  async delete(url: string): Promise<void> {
    if (!url.startsWith(`${this.serveRoot}/`)) return;

    const fileName = path.basename(url);
    const target = path.join(this.uploadsRoot, fileName);

    await rm(target, { force: true });
  }
}
