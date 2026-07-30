import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorResponseDto } from '../error-response.dto';
import { DomainError } from '../../errors/domain.error';

describe(ErrorResponseDto.name, () => {
  describe('constructor', () => {
    it('should create an instance with all required fields', () => {
      const dto = new ErrorResponseDto({
        statusCode: 404,
        code: 'UA-USR-001',
        message: 'User not found',
        traceId: 'req_abc123',
        timestamp: '2026-07-30T12:00:00.000Z',
      });

      expect(dto.statusCode).toBe(404);
      expect(dto.code).toBe('UA-USR-001');
      expect(dto.message).toBe('User not found');
      expect(dto.traceId).toBe('req_abc123');
      expect(dto.timestamp).toBe('2026-07-30T12:00:00.000Z');
    });

    it('should allow optional details field', () => {
      const dto = new ErrorResponseDto({
        statusCode: 400,
        code: 'UA-COM-005',
        message: 'Validation failed',
        details: [{ field: 'email', constraints: ['isEmail'] }],
        traceId: 'req_abc',
        timestamp: '2026-07-30T12:00:00.000Z',
      });

      expect(dto.details).toBeDefined();
      expect(dto.details).toHaveLength(1);
      expect(dto.details[0].field).toBe('email');
    });
  });

  describe('fromDomainError', () => {
    it('should produce ErrorResponseDto from a DomainError', () => {
      const error = DomainError.fromKind('USER_NOT_FOUND');
      const dto = ErrorResponseDto.fromDomainError(error, 'req_abc');

      expect(dto.statusCode).toBe(404);
      expect(dto.code).toBe('UA-USR-001');
      expect(dto.message).toBe('User not found');
      expect(dto.traceId).toBe('req_abc');
      expect(dto.timestamp).toBeDefined();
      expect(typeof dto.timestamp).toBe('string');
    });

    it('should preserve custom message from DomainError', () => {
      const error = DomainError.fromKind('USER_NOT_FOUND', { message: 'Custom message' });
      const dto = ErrorResponseDto.fromDomainError(error, 'req_abc');

      expect(dto.message).toBe('Custom message');
    });
  });

  describe('fromHttpException', () => {
    it('should produce ErrorResponseDto from an HttpException with string response', () => {
      const exc = new HttpException('Forbidden resource', HttpStatus.FORBIDDEN);
      const dto = ErrorResponseDto.fromHttpException(exc, 'req_abc');

      expect(dto.statusCode).toBe(403);
      expect(dto.message).toBe('Forbidden resource');
      expect(dto.traceId).toBe('req_abc');
      expect(dto.timestamp).toBeDefined();
      expect(dto.code).toBeDefined();
    });

    it('should extract code and message from object response', () => {
      const exc = new HttpException(
        { message: 'Custom error', code: 'UA-CUSTOM-001' },
        HttpStatus.BAD_REQUEST,
      );
      const dto = ErrorResponseDto.fromHttpException(exc, 'req_abc');

      expect(dto.statusCode).toBe(400);
      expect(dto.code).toBe('UA-CUSTOM-001');
      expect(dto.message).toBe('Custom error');
    });

    it('should join array messages with semicolons', () => {
      const exc = new HttpException(
        { message: ['email is required', 'name is required'] },
        HttpStatus.BAD_REQUEST,
      );
      const dto = ErrorResponseDto.fromHttpException(exc, 'req_abc');

      expect(dto.statusCode).toBe(400);
      expect(dto.message).toBe('email is required; name is required');
    });
  });

  describe('fromError', () => {
    it('should produce a 500 ErrorResponseDto from a plain Error', () => {
      const error = new Error('Something unexpected happened');
      const dto = ErrorResponseDto.fromError(error, 'req_abc');

      expect(dto.statusCode).toBe(500);
      expect(dto.code).toBe('UA-COM-001');
      expect(dto.message).toBe('Something unexpected happened');
      expect(dto.traceId).toBe('req_abc');
      expect(dto.timestamp).toBeDefined();
    });

    it('should use fallback message when Error has empty message', () => {
      const error = new Error();
      const dto = ErrorResponseDto.fromError(error, 'req_abc');

      expect(dto.statusCode).toBe(500);
      expect(dto.message).toBe('Internal server error');
    });
  });

  describe('traceId and timestamp', () => {
    it('should always include traceId in all factory methods', () => {
      const domainError = DomainError.fromKind('VALIDATION_ERROR');
      const httpExc = new HttpException('Bad request', HttpStatus.BAD_REQUEST);
      const plainError = new Error('Something broke');

      const dtos = [
        ErrorResponseDto.fromDomainError(domainError, 'trace-1'),
        ErrorResponseDto.fromHttpException(httpExc, 'trace-2'),
        ErrorResponseDto.fromError(plainError, 'trace-3'),
      ];

      expect(dtos[0].traceId).toBe('trace-1');
      expect(dtos[1].traceId).toBe('trace-2');
      expect(dtos[2].traceId).toBe('trace-3');
    });

    it('should always include a valid ISO timestamp', () => {
      const error = DomainError.fromKind('INTERNAL');
      const dto = ErrorResponseDto.fromDomainError(error, 'req_abc');

      expect(() => new Date(dto.timestamp)).not.toThrow();
      expect(new Date(dto.timestamp).toISOString()).toBe(dto.timestamp);
    });
  });
});
