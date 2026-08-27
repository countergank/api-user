import { DomainError } from '../domain.error';
import { ErrorKind } from '../error-kind';

describe(DomainError.name, () => {
  describe('fromKind', () => {
    it('should create a DomainError with the correct kind metadata', () => {
      const error = DomainError.fromKind('USER_NOT_FOUND');
      expect(error).toBeInstanceOf(DomainError);
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('DomainError');
      expect(error.kind).toBe(ErrorKind.USER_NOT_FOUND);
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('UA-USR-001');
    });

    it('should use the default message from ErrorKind when no message override', () => {
      const error = DomainError.fromKind('USER_NOT_FOUND');
      expect(error.message).toBe('User not found');
    });

    it('should allow overriding the message', () => {
      const error = DomainError.fromKind('USER_NOT_FOUND', { message: 'Custom message' });
      expect(error.message).toBe('Custom message');
    });

    it('should allow setting traceId via overrides', () => {
      const error = DomainError.fromKind('INTERNAL', { traceId: 'req_abc123' });
      expect(error.traceId).toBe('req_abc123');
    });

    it('should fallback to INTERNAL for unknown kind names', () => {
      const error = DomainError.fromKind('UNKNOWN_KIND' as any);
      expect(error.kind).toBe(ErrorKind.INTERNAL);
      expect(error.statusCode).toBe(500);
    });
  });

  describe('internal', () => {
    it('should create a generic 500 DomainError', () => {
      const error = DomainError.internal();
      expect(error).toBeInstanceOf(DomainError);
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('UA-COM-001');
      expect(error.message).toBe('Internal server error');
    });

    it('should allow overriding the internal error message', () => {
      const error = DomainError.internal('Something went terribly wrong');
      expect(error.message).toBe('Something went terribly wrong');
    });
  });

  describe('statusCode and code getters', () => {
    it('should return statusCode from kind', () => {
      const error = DomainError.fromKind('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
    });

    it('should return code from kind', () => {
      const error = DomainError.fromKind('ENTITY_NAME_ALREADY_EXISTS');
      expect(error.code).toBe('UA-COM-003');
    });
  });

  describe('traceId', () => {
    it('should be undefined when not provided', () => {
      const error = DomainError.fromKind('INTERNAL');
      expect(error.traceId).toBeUndefined();
    });

    it('should be set when provided in overrides', () => {
      const error = DomainError.fromKind('INTERNAL', { traceId: 'trace_xyz' });
      expect(error.traceId).toBe('trace_xyz');
    });
  });
});
