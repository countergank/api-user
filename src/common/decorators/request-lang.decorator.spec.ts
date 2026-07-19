import { ExecutionContext } from '@nestjs/common';
import { extractRequestLang } from './extract-request-lang.helper';

describe('extractRequestLang (pure function)', () => {
  const createMockContext = (acceptLanguage?: string): ExecutionContext => {
    const headers: Record<string, string> = {};
    if (acceptLanguage !== undefined) {
      headers['accept-language'] = acceptLanguage;
    }
    return {
      switchToHttp: () => ({
        getRequest: () => ({ headers }),
      }),
    } as unknown as ExecutionContext;
  };

  it('should extract "es" from Accept-Language: es-ES', () => {
    const ctx = createMockContext('es-ES');
    const result = extractRequestLang(null, ctx);

    expect(result).toBe('es');
  });

  it('should extract "en" from Accept-Language: en-US,en;q=0.9', () => {
    const ctx = createMockContext('en-US,en;q=0.9');
    const result = extractRequestLang(null, ctx);

    expect(result).toBe('en');
  });

  it('should extract "pt" from Accept-Language: pt-BR', () => {
    const ctx = createMockContext('pt-BR');
    const result = extractRequestLang(null, ctx);

    expect(result).toBe('pt');
  });

  it('should return undefined when no Accept-Language header is present', () => {
    const ctx = createMockContext(undefined);
    const result = extractRequestLang(null, ctx);

    expect(result).toBeUndefined();
  });

  it('should return undefined for unsupported language (fr-FR)', () => {
    const ctx = createMockContext('fr-FR');
    const result = extractRequestLang(null, ctx);

    expect(result).toBeUndefined();
  });
});
