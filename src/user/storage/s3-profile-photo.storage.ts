import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import {
  avatarObjectKey,
  AVATAR_KEY_PREFIX,
  PHOTO_CONTENT_TYPE_BY_EXTENSION,
  ProfilePhotoStorage,
} from './profile-photo-storage';
import { SupportedPhotoExtension } from './user-profile-photo.storage';
import { ProfilePhotoStorageError } from './user-profile-photo.errors';

@Injectable()
export class S3ProfilePhotoStorage implements ProfilePhotoStorage {
  private readonly client: S3Client;

  private readonly bucket: string;

  constructor(configService: ConfigService) {
    this.client = new S3Client({
      region: configService.getOrThrow<string>('S3_REGION'),
      endpoint: configService.getOrThrow<string>('S3_ENDPOINT'),
      credentials: {
        accessKeyId: configService.getOrThrow<string>('S3_ACCESS_KEY_ID'),
        secretAccessKey: configService.getOrThrow<string>('S3_SECRET_ACCESS_KEY'),
      },
      // R2, MinIO and B2 serve buckets under path-style URLs; virtual-host
      // style would resolve to buckets that do not exist as DNS records.
      forcePathStyle: true,
    });
    this.bucket = configService.getOrThrow<string>('S3_BUCKET');
  }

  async save(userId: string, buffer: Buffer, extension: SupportedPhotoExtension): Promise<string> {
    const key = avatarObjectKey(userId, extension);
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: buffer,
          ContentType: PHOTO_CONTENT_TYPE_BY_EXTENSION[extension],
        }),
      );
      return key;
    } catch (error) {
      throw new ProfilePhotoStorageError(error);
    }
  }

  async delete(url: string): Promise<void> {
    // Legacy `/uploads/avatars/...` values never existed in any bucket (local
    // disk was the only pre-#546 driver), so they are a deliberate no-op here:
    // deleting by basename would reach into whatever object happens to collide.
    if (!url.startsWith(AVATAR_KEY_PREFIX)) return;

    try {
      await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: url }));
    } catch (error) {
      throw new ProfilePhotoStorageError(error);
    }
  }
}
