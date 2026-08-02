import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ErrorResponseDto } from '../../dto/error-response.dto';
import { DomainError } from '../../errors/domain.error';
import { ErrorKindName } from '../../errors/error-kind';
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
      const error = new HttpException({ message: 'Custom error', code: 'UA-CUSTOM-001' }, HttpStatus.BAD_REQUEST);
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
          'errors.INVALID_CREDENTIALS': {
            es: 'Credenciales inválidas',
            en: 'Invalid credentials',
            pt: 'Credenciais inválidas',
          },
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

  describe('i18n translation — COU-209 new keys (real JSON translation files)', () => {
    let i18nFilter: AllExceptionsFilter;

    // Reads the actual translation JSON files so the filter tests prove the
    // committed en/es/pt values, not a hardcoded mirror (same fs pattern the
    // production I18nService uses in seedFromJson).
    const loadErrors = (lang: string): Record<string, string> => {
      const file = path.join(__dirname, '../../i18n/translations', `${lang}.json`);
      const data = JSON.parse(fs.readFileSync(file, 'utf-8')) as { errors: Record<string, string> };
      return data.errors;
    };

    const jsonTables = {
      en: loadErrors('en'),
      es: loadErrors('es'),
      pt: loadErrors('pt'),
    };

    // Mirrors I18nService.resolveDirect + translate: returns the key itself
    // when no translation exists for the given (key, lang) pair.
    const jsonMockI18n = {
      translate: jest.fn().mockImplementation(async (key: string, lang?: string) => {
        const suffix = key.replace(/^errors\./, '');
        const langCode = (lang ?? 'es') as 'en' | 'es' | 'pt';
        return jsonTables[langCode][suffix] ?? key;
      }),
    };

    const NEW_KEYS: Array<[string, 'en' | 'es' | 'pt', string]> = [
      ['INTERNAL', 'en', 'Internal server error'],
      ['INTERNAL', 'es', 'Error interno del servidor'],
      ['INTERNAL', 'pt', 'Erro interno do servidor'],
      ['APP_ERROR', 'en', 'Application error'],
      ['APP_ERROR', 'es', 'Error de la aplicación'],
      ['APP_ERROR', 'pt', 'Erro do aplicativo'],
      ['APP_VERSION_NOT_FOUND', 'en', 'App version not found'],
      ['APP_VERSION_NOT_FOUND', 'es', 'Versión de la app no encontrada'],
      ['APP_VERSION_NOT_FOUND', 'pt', 'Versão do app não encontrada'],
      ['ENTITY_NOT_FOUND', 'en', 'Entity not found'],
      ['ENTITY_NOT_FOUND', 'es', 'Entidad no encontrada'],
      ['ENTITY_NOT_FOUND', 'pt', 'Entidade não encontrada'],
      ['ENTITY_NAME_ALREADY_EXISTS', 'en', 'Name already exists'],
      ['ENTITY_NAME_ALREADY_EXISTS', 'es', 'El nombre ya existe'],
      ['ENTITY_NAME_ALREADY_EXISTS', 'pt', 'O nome já existe'],
      ['ENTITY_EMAIL_ALREADY_EXISTS', 'en', 'Email already exists'],
      ['ENTITY_EMAIL_ALREADY_EXISTS', 'es', 'El email ya existe'],
      ['ENTITY_EMAIL_ALREADY_EXISTS', 'pt', 'O email já existe'],
      ['USER_ALREADY_DELETED', 'en', 'User already deleted'],
      ['USER_ALREADY_DELETED', 'es', 'El usuario ya fue eliminado'],
      ['USER_ALREADY_DELETED', 'pt', 'O usuário já foi excluído'],
      ['TEMPLATE_SLUG_ALREADY_EXISTS', 'en', 'Template with this slug already exists'],
      ['TEMPLATE_SLUG_ALREADY_EXISTS', 'es', 'Ya existe una plantilla con este slug'],
      ['TEMPLATE_SLUG_ALREADY_EXISTS', 'pt', 'Já existe um template com este slug'],
      ['TEMPLATE_NOT_FOUND', 'en', 'Template not found'],
      ['TEMPLATE_NOT_FOUND', 'es', 'Plantilla no encontrada'],
      ['TEMPLATE_NOT_FOUND', 'pt', 'Template não encontrado'],
      ['TEMPLATE_FILE_NOT_FOUND', 'en', 'Default template file not found'],
      ['TEMPLATE_FILE_NOT_FOUND', 'es', 'Archivo de plantilla predeterminado no encontrado'],
      ['TEMPLATE_FILE_NOT_FOUND', 'pt', 'Arquivo de template padrão não encontrado'],
      ['PARAMETER_NOT_FOUND', 'en', 'Parameter not found'],
      ['PARAMETER_NOT_FOUND', 'es', 'Parámetro no encontrado'],
      ['PARAMETER_NOT_FOUND', 'pt', 'Parâmetro não encontrado'],
      ['PARAMETER_OVERRIDDEN', 'en', 'Parameter is overridden by environment'],
      ['PARAMETER_OVERRIDDEN', 'es', 'El parámetro está sobrescrito por la variable de entorno'],
      ['PARAMETER_OVERRIDDEN', 'pt', 'O parâmetro é sobrescrito pela variável de ambiente'],
      ['PARAMETER_VALUE_INVALID', 'en', 'Invalid value for parameter'],
      ['PARAMETER_VALUE_INVALID', 'es', 'Valor inválido para el parámetro'],
      ['PARAMETER_VALUE_INVALID', 'pt', 'Valor inválido para o parâmetro'],
      ['MICROSERVICE_UNAVAILABLE', 'en', 'Microservice unavailable'],
      ['MICROSERVICE_UNAVAILABLE', 'es', 'Microservicio no disponible'],
      ['MICROSERVICE_UNAVAILABLE', 'pt', 'Microserviço indisponível'],
    ];

    const PRE_EXISTING_KEYS = [
      'USER_NOT_FOUND',
      'INVALID_CREDENTIALS',
      'INTERNAL_ERROR',
      'VALIDATION_ERROR',
      'EMAIL_ALREADY_EXISTS',
      'USER_ALREADY_EXISTS',
      'EMAIL_OR_USERNAME_EXISTS',
      'ACCOUNT_INACTIVE',
      'CURRENT_PASSWORD_INCORRECT',
      'INVALID_REFRESH_TOKEN',
      'NO_PENDING_EMAIL_CHANGE',
      'INVALID_TOKEN',
      'TOKEN_EXPIRED',
      'FORBIDDEN',
      'BAD_REQUEST',
      'RATE_LIMITED',
      'ACCOUNT_LOCKED',
      'EXPIRED_RESET_TOKEN',
      'EXPIRED_VERIFICATION_TOKEN',
      'EXPIRED_CONFIRMATION_TOKEN',
      'INVALID_USER_ID',
    ];

    beforeEach(() => {
      i18nFilter = new AllExceptionsFilter(jsonMockI18n as unknown as I18nService);
    });

    it.each(NEW_KEYS)(
      'translates DomainError %s to "%s" with Accept-Language %s',
      async (kind, lang, expectedMessage) => {
        mockRequest.headers = { 'accept-language': lang };

        const error = DomainError.fromKind(kind as ErrorKindName);
        await i18nFilter.catch(error, mockHost);

        expect(mockResponse.send).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expectedMessage,
          }),
        );
      },
    );

    it('stores the exact spec value for every new key in each language JSON file', () => {
      for (const [kind, lang, expected] of NEW_KEYS) {
        expect(jsonTables[lang][kind]).toBe(expected);
      }
    });

    it('keeps all 21 pre-existing error keys intact in every language', () => {
      for (const lang of ['en', 'es', 'pt'] as const) {
        for (const key of PRE_EXISTING_KEYS) {
          expect(jsonTables[lang][key]).toBeDefined();
        }
      }
    });

    it('keeps the errors section at exactly 35 keys per language (21 existing + 14 new)', () => {
      expect(Object.keys(jsonTables.en)).toHaveLength(35);
      expect(Object.keys(jsonTables.es)).toHaveLength(35);
      expect(Object.keys(jsonTables.pt)).toHaveLength(35);
    });
  });
});
