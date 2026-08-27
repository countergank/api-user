import { ErrorKind } from '../error-kind';

describe('ErrorKind Registry', () => {
  it('should define INTERNAL error with 500 status', () => {
    expect(ErrorKind.INTERNAL).toBeDefined();
    expect(ErrorKind.INTERNAL.kind).toBe('INTERNAL');
    expect(ErrorKind.INTERNAL.statusCode).toBe(500);
    expect(ErrorKind.INTERNAL.code).toBe('UA-COM-001');
    expect(ErrorKind.INTERNAL.defaultMessage).toBe('Internal server error');
  });

  it('should define USER_NOT_FOUND error with 404 status', () => {
    expect(ErrorKind.USER_NOT_FOUND).toBeDefined();
    expect(ErrorKind.USER_NOT_FOUND.kind).toBe('USER_NOT_FOUND');
    expect(ErrorKind.USER_NOT_FOUND.statusCode).toBe(404);
    expect(ErrorKind.USER_NOT_FOUND.code).toBe('UA-USR-001');
    expect(ErrorKind.USER_NOT_FOUND.defaultMessage).toBe('User not found');
  });

  it('should define ENTITY_EMAIL_ALREADY_EXISTS error with 409 status', () => {
    expect(ErrorKind.ENTITY_EMAIL_ALREADY_EXISTS).toBeDefined();
    expect(ErrorKind.ENTITY_EMAIL_ALREADY_EXISTS.kind).toBe('ENTITY_EMAIL_ALREADY_EXISTS');
    expect(ErrorKind.ENTITY_EMAIL_ALREADY_EXISTS.statusCode).toBe(409);
    expect(ErrorKind.ENTITY_EMAIL_ALREADY_EXISTS.code).toBe('UA-COM-004');
    expect(ErrorKind.ENTITY_EMAIL_ALREADY_EXISTS.defaultMessage).toBe('Email already exists');
  });

  it('should define VALIDATION_ERROR error with 400 status', () => {
    expect(ErrorKind.VALIDATION_ERROR).toBeDefined();
    expect(ErrorKind.VALIDATION_ERROR.statusCode).toBe(400);
    expect(ErrorKind.VALIDATION_ERROR.code).toBe('UA-COM-005');
    expect(ErrorKind.VALIDATION_ERROR.defaultMessage).toBe('Validation failed');
  });

  it('should define USER_ALREADY_DELETED error with 410 status', () => {
    expect(ErrorKind.USER_ALREADY_DELETED).toBeDefined();
    expect(ErrorKind.USER_ALREADY_DELETED.statusCode).toBe(410);
    expect(ErrorKind.USER_ALREADY_DELETED.code).toBe('UA-USR-002');
    expect(ErrorKind.USER_ALREADY_DELETED.defaultMessage).toBe('User already deleted');
  });

  it('should define APP_VERSION_NOT_FOUND error with 404 status', () => {
    expect(ErrorKind.APP_VERSION_NOT_FOUND).toBeDefined();
    expect(ErrorKind.APP_VERSION_NOT_FOUND.statusCode).toBe(404);
    expect(ErrorKind.APP_VERSION_NOT_FOUND.code).toBe('UA-APP-002');
  });

  it('should have consistent structure across all entries', () => {
    const entries = Object.values(ErrorKind);
    expect(entries.length).toBeGreaterThanOrEqual(8);

    for (const entry of entries) {
      expect(entry).toHaveProperty('kind');
      expect(entry).toHaveProperty('group');
      expect(entry).toHaveProperty('code');
      expect(entry).toHaveProperty('statusCode');
      expect(entry).toHaveProperty('defaultMessage');
      expect(typeof entry.kind).toBe('string');
      expect(typeof entry.group).toBe('string');
      expect(typeof entry.code).toBe('string');
      expect(typeof entry.statusCode).toBe('number');
      expect(typeof entry.defaultMessage).toBe('string');
    }
  });

  it('should have unique codes across all entries', () => {
    const codes = Object.values(ErrorKind).map((e) => e.code);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });

  it('should have codes matching UA-{GROUP}-{NNN} format', () => {
    const codePattern = /^UA-[A-Z]{3,4}-\d{3}$/;
    for (const entry of Object.values(ErrorKind)) {
      expect(entry.code).toMatch(codePattern);
    }
  });
});
