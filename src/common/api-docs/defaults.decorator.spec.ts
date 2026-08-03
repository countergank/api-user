import * as fs from 'node:fs';
import * as path from 'node:path';

describe('defaults.decorator Swagger re-point', () => {
  const filePath = path.join(__dirname, 'defaults.decorator.ts');
  const source = fs.readFileSync(filePath, 'utf-8');

  it('should import ErrorResponseDto from the unified DTO', () => {
    expect(source).toContain("import { ErrorResponseDto } from '../dto/error-response.dto'");
  });

  it('should no longer reference legacy bad-request.error.ts', () => {
    expect(source).not.toContain('bad-request.error');
  });

  it('should no longer reference legacy internal-server.error.ts', () => {
    expect(source).not.toContain('internal-server.error');
  });

  it('should no longer reference error-base helpers', () => {
    expect(source).not.toContain('error-base');
  });

  it('should use ErrorResponseDto as the error response type', () => {
    expect(source).toContain('type: ErrorResponseDto');
  });
});
