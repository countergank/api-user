import { resolveProfilePhotoPublicUrl, sanitizeLogValue } from './profile-photo-storage';

describe('sanitizeLogValue (S2)', () => {
  it('flattens newlines and control characters to single spaces', () => {
    expect(sanitizeLogValue('disk full\nERROR injected\u001b[31m fake line')).toBe(
      'disk full ERROR injected fake line',
    );
  });

  it('trims and caps the message length', () => {
    expect(sanitizeLogValue('  x  ')).toBe('x');
    expect(sanitizeLogValue('a'.repeat(250)).length).toBeLessThanOrEqual(203);
  });
});

// #550 S1
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
      resolveProfilePhotoPublicUrl('avatar/u-1-170.png', 'https://cdn.example/', 's3'),
    ).toBe('https://cdn.example/avatar/u-1-170.png');
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

  it('resolves to undefined for stored values that never came from this module (S6)', () => {
    expect(resolveProfilePhotoPublicUrl('avatar/crafted.png')).toBeUndefined();
    expect(resolveProfilePhotoPublicUrl('avatar/..')).toBeUndefined();
    expect(resolveProfilePhotoPublicUrl('weird-value')).toBeUndefined();
  });

  it('ignores an invalid STORAGE_PUBLIC_URL and falls back to the local served path (S6)', () => {
    expect(resolveProfilePhotoPublicUrl('avatar/u-1-170.png', 'not-a-url', 'local')).toBe(
      '/uploads/avatars/u-1-170.png',
    );
    expect(resolveProfilePhotoPublicUrl('avatar/u-1-170.png', 'ftp://x', 'local')).toBe(
      '/uploads/avatars/u-1-170.png',
    );
  });

  it('resolves nothing when the s3 driver has no valid public base configured (S6)', () => {
    expect(resolveProfilePhotoPublicUrl('avatar/u-1-170.png', undefined, 's3')).toBeUndefined();
    expect(resolveProfilePhotoPublicUrl('avatar/u-1-170.png', 'not-a-url', 's3')).toBeUndefined();
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
