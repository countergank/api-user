import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { ErrorResponseDto } from '../../dto/error-response.dto';
import { DomainError } from '../../errors/domain.error';
import { I18nService } from '../../i18n/i18n.service';
import { AllExceptionsFilter } from '../all-exceptions.filter';

describe(AllExceptionsFilter.name, () => {
  let filter: AllExceptionsFilter;
  let mockRequest: Record<string, unknown>;
  let mockResponse: Record<string, unknown>;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new AllExceptionsFilter();

    mockRequest = {
      id: 'req_hyperid_123',
    };

    mockResponse = {
      statusCode: 200,
      send: jest.fn().mockReturnThis(),
    };

    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as unknown as ArgumentsHost;
  });

  function getSentEnvelope(): ErrorResponseDto {
    return (mockResponse.send as jest.Mock).mock.calls[0][0] as ErrorResponseDto;
  }

  describe('DomainError branch', () => {
    it('should return envelope with DomainError statusCode and code', () => {
      const error = DomainError.fromKind('ENTITY_NOT_FOUND');
      filter.catch(error, mockHost);

      expect(mockResponse.statusCode).toBe(HttpStatus.NOT_FOUND);
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.NOT_FOUND,
          code: 'UA-COM-002',
          message: 'Entity not found',
          traceId: 'req_hyperid_123',
        }),
      );
    });

    it('should include timestamp in the envelope', () => {
      const error = DomainError.fromKind('ENTITY_NOT_FOUND');
      filter.catch(error, mockHost);

      const sentEnvelope = getSentEnvelope();
      expect(sentEnvelope.timestamp).toBeDefined();
      expect(typeof sentEnvelope.timestamp).toBe('string');
      expect(() => new Date(sentEnvelope.timestamp)).not.toThrow();
    });

    it('should use traceId from request.traceId if set by middleware', () => {
      mockRequest.traceId = 'from_middleware_456';
      const error = DomainError.fromKind('USER_NOT_FOUND');
      filter.catch(error, mockHost);

      const sentEnvelope = getSentEnvelope();
      expect(sentEnvelope.traceId).toBe('from_middleware_456');
    });
  });

  describe('HttpException branch', () => {
    it('should return envelope with HttpException status and message', () => {
      const error = new HttpException('Forbidden resource', HttpStatus.FORBIDDEN);
      filter.catch(error, mockHost);

      expect(mockResponse.statusCode).toBe(HttpStatus.FORBIDDEN);
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.FORBIDDEN,
          message: 'Forbidden resource',
        }),
      );
    });

    it('should extract object response from HttpException', () => {
      const error = new HttpException(
        { message: 'Custom error', code: 'UA-CUSTOM-001' },
        HttpStatus.BAD_REQUEST,
      );
      filter.catch(error, mockHost);

      expect(mockResponse.statusCode).toBe(HttpStatus.BAD_REQUEST);
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          code: 'UA-CUSTOM-001',
          message: 'Custom error',
        }),
      );
    });

    it('should fallback to default code when HttpException response has no code', () => {
      const error = new HttpException('Simple error', HttpStatus.BAD_REQUEST);
      filter.catch(error, mockHost);

      const sentEnvelope = getSentEnvelope();
      expect(sentEnvelope.statusCode).toBe(HttpStatus.BAD_REQUEST);
      expect(sentEnvelope.message).toBe('Simple error');
      expect(sentEnvelope.code).toBeDefined();
    });
  });

  describe('Unknown Error branch', () => {
    it('should return 500 for unknown errors', () => {
      const error = new Error('Something unexpected happened');
      filter.catch(error, mockHost);

      expect(mockResponse.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Something unexpected happened',
          code: 'UA-COM-001',
        }),
      );
    });

    it('should still include traceId and timestamp for unknown errors', () => {
      const error = new Error('Something unexpected happened');
      filter.catch(error, mockHost);

      const sentEnvelope = getSentEnvelope();
      expect(sentEnvelope.traceId).toBe('req_hyperid_123');
      expect(sentEnvelope.timestamp).toBeDefined();
    });

    it('should handle non-Error unknown types by wrapping in Error', () => {
      filter.catch('string error message', mockHost);

      expect(mockResponse.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      const sentEnvelope = getSentEnvelope();
      expect(sentEnvelope.message).toBe('string error message');
      expect(sentEnvelope.code).toBe('UA-COM-001');
    });
  });

  describe('traceId fallback', () => {
    it('should use request.id when traceId is not on request', () => {
      const error = DomainError.fromKind('ENTITY_NOT_FOUND');
      filter.catch(error, mockHost);

      const sentEnvelope = getSentEnvelope();
      expect(sentEnvelope.traceId).toBe('req_hyperid_123');
    });

    it('should fallback to empty string when neither traceId nor id is available', () => {
      mockRequest.id = undefined;
      const error = DomainError.fromKind('ENTITY_NOT_FOUND');
      filter.catch(error, mockHost);

      const sentEnvelope = getSentEnvelope();
      expect(sentEnvelope.traceId).toBe('');
    });
  });

  describe('i18n translation', () => {
    let i18nFilter: AllExceptionsFilter;

    // Mirror I18nService.translate behavior: returns the key itself when no
    // translation exists for the given (key, lang) pair.
    const mockI18n = {
      translate: jest.fn().mockImplementation(async (key: string, lang?: string) => {
        const table: Record<string, Record<string, string>> = {
          'errors.USER_NOT_FOUND': { es: 'Usuario no encontrado', en: 'User not found', pt: 'Usuário não encontrado' },
          'errors.INVALID_CREDENTIALS': { es: 'Credenciales inválidas', en: 'Invalid credentials', pt: 'Credenciais inválidas' },
        };
        return table[key]?.[lang ?? 'es'] ?? key;
      }),
    };

    beforeEach(() => {
      i18nFilter = new AllExceptionsFilter(mockI18n as unknown as I18nService);
    });

    it('should translate DomainError message via i18n respecting Accept-Language', async () => {
      mockRequest.headers = { 'accept-language': 'es' };
      mockRequest.traceId = 'req_i18n_es';

      const error = DomainError.fromKind('USER_NOT_FOUND');
      await i18nFilter.catch(error, mockHost);

      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.NOT_FOUND,
          code: 'UA-USR-001',
          message: 'Usuario no encontrado',
          traceId: 'req_i18n_es',
        }),
      );
    });

    it('should translate DomainError message in English when Accept-Language is en', async () => {
      mockRequest.headers = { 'accept-language': 'en' };

      const error = DomainError.fromKind('USER_NOT_FOUND');
      await i18nFilter.catch(error, mockHost);

      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User not found',
        }),
      );
    });

    it('should fall back to default message when no translation exists', async () => {
      mockRequest.headers = { 'accept-language': 'es' };

      const error = DomainError.fromKind('ENTITY_NOT_FOUND');
      await i18nFilter.catch(error, mockHost);

      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Entity not found',
        }),
      );
    });

    it('should translate HttpException message that matches an i18n error key', async () => {
      mockRequest.headers = { 'accept-language': 'pt' };

      const error = new HttpException('INVALID_CREDENTIALS', HttpStatus.UNAUTHORIZED);
      await i18nFilter.catch(error, mockHost);

      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Credenciais inválidas',
        }),
      );
    });

    it('should keep HttpException message when no translation exists', async () => {
      mockRequest.headers = { 'accept-language': 'es' };

      const error = new HttpException('Forbidden resource', HttpStatus.FORBIDDEN);
      await i18nFilter.catch(error, mockHost);

      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Forbidden resource',
        }),
      );
    });
  });
});
