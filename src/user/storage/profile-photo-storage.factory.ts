import { ConfigService } from '@nestjs/config';
import { PROFILE_PHOTO_STORAGE, ProfilePhotoStorage } from './profile-photo-storage';
import { LocalProfilePhotoStorage } from './local-profile-photo.storage';
import { S3ProfilePhotoStorage } from './s3-profile-photo.storage';

export { PROFILE_PHOTO_STORAGE };

export function profilePhotoStorageFactory(configService: ConfigService): ProfilePhotoStorage {
  if (configService.get<string>('STORAGE_DRIVER') === 's3') {
    return new S3ProfilePhotoStorage(configService);
  }
  return new LocalProfilePhotoStorage();
}
