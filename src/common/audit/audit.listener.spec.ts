import { redactSensitiveFields } from './audit.listener';

describe('redactSensitiveFields', () => {
  it('should redact password field', () => {
    const input = { password: 'secret123', email: 'user@test.com' };
    const result = redactSensitiveFields(input);
    expect(result.password).toBe('[REDACTED]');
    expect(result.email).toBe('user@test.com');
  });

  it('should redact token field', () => {
    const input = { token: 'abc123', name: 'John' };
    const result = redactSensitiveFields(input);
    expect(result.token).toBe('[REDACTED]');
    expect(result.name).toBe('John');
  });

  it('should redact authorization field', () => {
    const input = { authorization: 'Bearer xyz', userId: '123' };
    const result = redactSensitiveFields(input);
    expect(result.authorization).toBe('[REDACTED]');
  });

  it('should redact refreshToken field', () => {
    const input = { refreshToken: 'refresh-abc', email: 'test@test.com' };
    const result = redactSensitiveFields(input);
    expect(result.refreshToken).toBe('[REDACTED]');
  });

  it('should redact nested sensitive fields', () => {
    const input = {
      user: {
        password: 'secret',
        name: 'John',
        credentials: {
          token: 'token-value',
        },
      },
    };
    const result = redactSensitiveFields(input);
    expect((result.user as any).password).toBe('[REDACTED]');
    expect((result.user as any).name).toBe('John');
    expect((result.user as any).credentials.token).toBe('[REDACTED]');
  });

  it('should redact fields with token substring case-insensitively', () => {
    const input = {
      resetPasswordToken: 'reset-token',
      emailVerificationToken: 'verify-token',
      pendingEmailToken: 'pending-token',
    };
    const result = redactSensitiveFields(input);
    expect(result.resetPasswordToken).toBe('[REDACTED]');
    expect(result.emailVerificationToken).toBe('[REDACTED]');
    expect(result.pendingEmailToken).toBe('[REDACTED]');
  });

  it('should handle arrays', () => {
    const input = {
      items: [
        { password: 'pass1', name: 'a' },
        { password: 'pass2', name: 'b' },
      ],
    };
    const result = redactSensitiveFields(input);
    expect((result.items as any[])[0].password).toBe('[REDACTED]');
    expect((result.items as any[])[1].password).toBe('[REDACTED]');
  });

  it('should return non-object values unchanged', () => {
    expect(redactSensitiveFields('string' as any)).toBe('string');
    expect(redactSensitiveFields(42 as any)).toBe(42);
    expect(redactSensitiveFields(null as any)).toBe(null);
    expect(redactSensitiveFields(undefined as any)).toBe(undefined);
  });

  it('should not modify the original object', () => {
    const input = { password: 'secret', email: 'test@test.com' };
    const original = { ...input };
    redactSensitiveFields(input);
    expect(input).toEqual(original);
  });
});
