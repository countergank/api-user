import { resolveProfilePhotoPublicUrl } from './profile-photo-storage';

describe('resolveProfilePhotoPublicUrl (#546 S3)', () => {
  it('maps a key to the local served path when no public base is configured (S5.1)', () => {
    expect(resolveProfilePhotoPublicUrl('avatar/u-1-170.png')).toBe('/uploads/avatars/u-1-170.png');
  });

  it('prepends STORAGE_PUBLIC_URL for s3 keys (S5.2)', () => {
    expect(
      resolveProfilePhotoPublicUrl('avatar/u-1-170.png', 'https://assets.countergank.com', 's3'),
    ).toBe('https://assets.countergank.com/avatar/u-1-170.png');
  });

  it('trims trailing slashes from the configured base (s3)', () => {
    expect(
      resolveProfilePhotoPublicUrl('avatar/u.png', 'https://cdn.example/', 's3'),
    ).toBe('https://cdn.example/avatar/u.png');
  });

  it('prepends the base to the served local path so the frontend gets an absolute URL (#546 L7)', () => {
    expect(
      resolveProfilePhotoPublicUrl('avatar/u-1-170.png', 'http://localhost:3001', 'local'),
    ).toBe('http://localhost:3001/uploads/avatars/u-1-170.png');
  });

  it('keeps the relative served path for the local driver when no base is set (S5.1)', () => {
    expect(resolveProfilePhotoPublicUrl('avatar/u-1-170.png', undefined, 'local')).toBe(
      '/uploads/avatars/u-1-170.png',
    );
  });

  it('resolves s3 keys under the bucket base (S5.2)', () => {
    expect(
      resolveProfilePhotoPublicUrl('avatar/u-1-170.png', 'https://assets.countergank.com', 's3'),
    ).toBe('https://assets.countergank.com/avatar/u-1-170.png');
  });

  it('passes legacy URL values through untouched (L3)', () => {
    expect(resolveProfilePhotoPublicUrl('/uploads/avatars/u-1-old.png', 'https://cdn.example')).toBe(
      '/uploads/avatars/u-1-old.png',
    );
  });

  it('resolves nothing when the user never uploaded a photo', () => {
    expect(resolveProfilePhotoPublicUrl(undefined)).toBeUndefined();
  });
});
