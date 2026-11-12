import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { LocalProfilePhotoStorage } from './local-profile-photo.storage';

describe('LocalProfilePhotoStorage', () => {
  let uploadsRoot: string;
  let storage: LocalProfilePhotoStorage;
  const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

  beforeEach(async () => {
    uploadsRoot = await mkdtemp(path.join(tmpdir(), 'avatars-'));
    storage = new LocalProfilePhotoStorage(uploadsRoot);
  });

  afterEach(async () => {
    await rm(uploadsRoot, { recursive: true, force: true });
  });

  it('save writes the buffer under avatar/ and returns the key (#546 S1, S5.1)', async () => {
    const key = await storage.save('user-1', PNG, 'png');

    expect(key).toMatch(/^avatar\/user-1-\d+\.png$/);
    await expect(readFile(path.join(uploadsRoot, 'user-1-0.png'))).rejects.toThrow();
    const saved = await readFile(
      path.join(uploadsRoot, path.basename(key.slice('avatar/'.length))),
    );
    expect(saved).toEqual(PNG);
  });

  it('delete removes the object behind a key (#546 S5.3)', async () => {
    const key = await storage.save('user-1', PNG, 'png');
    const fileName = path.basename(key);

    await storage.delete(key);

    await expect(readFile(path.join(uploadsRoot, fileName))).rejects.toThrow();
  });

  it('delete still removes legacy /uploads/avatars/ URLs persisted before #546', async () => {
    const key = await storage.save('user-1', PNG, 'png');
    const fileName = path.basename(key);

    await storage.delete(`/uploads/avatars/${fileName}`);

    await expect(readFile(path.join(uploadsRoot, fileName))).rejects.toThrow();
  });

  it('delete ignores foreign URLs without touching the filesystem', async () => {
    const key = await storage.save('user-1', PNG, 'png');

    await expect(storage.delete('https://evil.example/avatar/user-1.png')).resolves.toBeUndefined();

    await expect(
      readFile(path.join(uploadsRoot, path.basename(key))),
    ).resolves.toEqual(PNG);
  });

  it('delete ignores stored values whose basename does not match the driver pattern (S1)', async () => {
    const key = await storage.save('user-1', PNG, 'png');

    // A crafted stored value (another user's path shape, traversal, or a bare
    // name) must never reach the filesystem: only `<userId>-<timestamp>.<ext>`
    // basenames the driver itself generates are deletable.
    await storage.delete('avatar/other-user.png');
    await storage.delete('avatar/..');
    await storage.delete('/uploads/avatars/crafted-name.png');

    await expect(
      readFile(path.join(uploadsRoot, path.basename(key))),
    ).resolves.toEqual(PNG);
  });
});
