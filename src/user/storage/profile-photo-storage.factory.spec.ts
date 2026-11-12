import { profilePhotoStorageFactory } from './profile-photo-storage.factory';
import { LocalProfilePhotoStorage } from './local-profile-photo.storage';
import { S3ProfilePhotoStorage } from './s3-profile-photo.storage';

const s3Env = {
  STORAGE_DRIVER: 's3',
  S3_ENDPOINT: 'https://<account>.r2.cloudflarestorage.com',
  S3_REGION: 'auto',
  S3_BUCKET: 'assets.countergank.com',
  S3_ACCESS_KEY_ID: 'key-id',
  S3_SECRET_ACCESS_KEY: 'secret',
};

const configWith = (values: Record<string, string | undefined>) =>
  ({
    get: (key: string) => values[key],
    getOrThrow: (key: string) => {
      if (values[key] === undefined) throw new Error(`Missing environment variable: ${key}`);
      return values[key];
    },
  }) as any;

describe('profile photo storage factory (#546 S2)', () => {
  it('delivers the local driver by default so dev and CI need no credentials (S5.1)', () => {
    expect(profilePhotoStorageFactory(configWith({}))).toBeInstanceOf(LocalProfilePhotoStorage);
    expect(profilePhotoStorageFactory(configWith({ STORAGE_DRIVER: 'local' }))).toBeInstanceOf(
      LocalProfilePhotoStorage,
    );
  });

  it('delivers the S3 driver when STORAGE_DRIVER=s3 (S2)', () => {
    expect(profilePhotoStorageFactory(configWith(s3Env))).toBeInstanceOf(S3ProfilePhotoStorage);
  });

  it('rejects an unknown driver value as the local default does not apply', () => {
    expect(profilePhotoStorageFactory(configWith({ STORAGE_DRIVER: 'gcs' }))).toBeInstanceOf(
      LocalProfilePhotoStorage,
    );
  });
});
