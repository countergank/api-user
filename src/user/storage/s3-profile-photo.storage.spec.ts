import { ConfigService } from '@nestjs/config';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { S3ProfilePhotoStorage } from './s3-profile-photo.storage';
import { ProfilePhotoStorageError } from './user-profile-photo.errors';

const sendMock = jest.spyOn(S3Client.prototype, 'send');

const config = {
  getOrThrow: (key: string) => {
    const values: Record<string, string> = {
      S3_ENDPOINT: 'https://<account>.r2.cloudflarestorage.com',
      S3_REGION: 'auto',
      S3_BUCKET: 'assets.countergank.com',
      S3_ACCESS_KEY_ID: 'key-id',
      S3_SECRET_ACCESS_KEY: 'secret',
    };
    if (values[key] === undefined) throw new Error(`Missing environment variable: ${key}`);
    return values[key];
    },
} as unknown as ConfigService;

describe('S3ProfilePhotoStorage (#546 S1, S5.2)', () => {
  const storage = new S3ProfilePhotoStorage(config);
  const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

  beforeEach(() => {
    sendMock.mockReset();
    sendMock.mockResolvedValue({} as never);
  });

  it('save uploads the buffer to the configured bucket and returns the key (S5.2)', async () => {
    const key = await storage.save('user-1', PNG, 'png');

    expect(key).toMatch(/^avatar\/user-1-\d+\.png$/);
    expect(sendMock).toHaveBeenCalledTimes(1);
    const command = sendMock.mock.calls[0][0] as PutObjectCommand;
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input.Bucket).toBe('assets.countergank.com');
    expect(command.input.Key).toBe(key);
    expect(command.input.Body).toEqual(PNG);
    expect(command.input.ContentType).toBe('image/png');
  });

  it('save wraps an S3 failure in a ProfilePhotoStorageError (S5.4)', async () => {
    sendMock.mockRejectedValueOnce(new Error('bucket unavailable') as never);

    await expect(storage.save('user-1', PNG, 'png')).rejects.toBeInstanceOf(
      ProfilePhotoStorageError,
    );
  });

  it('delete issues DeleteObjectCommand for keys stored by this driver (S5.3)', async () => {
    await storage.delete('avatar/user-1-1700000000000.png');

    expect(sendMock).toHaveBeenCalledTimes(1);
    const command = sendMock.mock.calls[0][0] as DeleteObjectCommand;
    expect(command).toBeInstanceOf(DeleteObjectCommand);
    expect(command.input.Bucket).toBe('assets.countergank.com');
    expect(command.input.Key).toBe('avatar/user-1-1700000000000.png');
  });

  it('delete ignores legacy local URLs and foreign values without an S3 call', async () => {
    await storage.delete('/uploads/avatars/user-1-old.png');
    await storage.delete('https://evil.example/avatar/user-1.png');

    expect(sendMock).not.toHaveBeenCalled();
  });
});
