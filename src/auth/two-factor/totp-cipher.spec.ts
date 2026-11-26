import { decryptTotpSecret, encryptTotpSecret } from './totp-cipher';

const PASSWORD = 'unit-test-encryption-password';

describe('totp-cipher', () => {
  it('round-trips the plaintext secret', () => {
    const ciphertext = encryptTotpSecret('JBSWY3DPEHPK3PXP', PASSWORD);

    expect(ciphertext).not.toBe('JBSWY3DPEHPK3PXP');
    expect(decryptTotpSecret(ciphertext, PASSWORD)).toBe('JBSWY3DPEHPK3PXP');
  });

  it('produces a different ciphertext for the same plaintext (random IV)', () => {
    const first = encryptTotpSecret('JBSWY3DPEHPK3PXP', PASSWORD);
    const second = encryptTotpSecret('JBSWY3DPEHPK3PXP', PASSWORD);

    expect(first).not.toBe(second);
  });

  it('rejects a ciphertext decrypted with the wrong password (GCM auth tag)', () => {
    const ciphertext = encryptTotpSecret('JBSWY3DPEHPK3PXP', PASSWORD);

    expect(() => decryptTotpSecret(ciphertext, 'wrong-password')).toThrow();
  });

  it('rejects a malformed payload', () => {
    expect(() => decryptTotpSecret('not-a-cipher-payload', PASSWORD)).toThrow();
  });
});
