import { FileTypeResult, fromBuffer } from 'file-type';

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
