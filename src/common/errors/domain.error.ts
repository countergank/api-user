import { ErrorKind, ErrorKindName, ErrorKindEntry } from './error-kind';

/**
 * DomainError — single domain error class extending native Error.
 *
 * Data-driven by the ErrorKind registry. No inheritance hierarchy.
 *
 * ```ts
 * // Throw by kind
 * throw DomainError.fromKind('USER_NOT_FOUND');
 *
 * // With custom message
 * throw DomainError.fromKind('USER_NOT_FOUND', { message: 'Custom message' });
 *
 * // With traceId
 * throw DomainError.fromKind('USER_NOT_FOUND', { traceId: 'req_abc' });
 * ```
 */
export class DomainError extends Error {
  public readonly kind: ErrorKindEntry;
  public readonly traceId?: string;

  private constructor(kind: ErrorKindEntry, message?: string, traceId?: string) {
    super(message || kind.defaultMessage);
    this.name = 'DomainError';
    this.kind = kind;
    this.traceId = traceId;
  }

  /**
   * HTTP status code derived from the ErrorKind entry.
   */
  get statusCode(): number {
    return this.kind.statusCode;
  }

  /**
   * Error code string (e.g. 'UA-USR-001') derived from the ErrorKind entry.
   */
  get code(): string {
    return this.kind.code;
  }

  /**
   * Create a DomainError from a known ErrorKind name.
   * @param name — key from the ErrorKind registry
   * @param overrides — optional message and/or traceId overrides
   */
  static fromKind(name: ErrorKindName, overrides?: {
    message?: string;
    traceId?: string;
  }): DomainError {
    const kind = ErrorKind[name];
    if (!kind) {
      // Fallback to INTERNAL if unknown kind
      return new DomainError(ErrorKind.INTERNAL, `Unknown error kind: ${name}`);
    }
    return new DomainError(kind, overrides?.message, overrides?.traceId);
  }

  /**
   * Create a generic 500 DomainError for unexpected errors.
   */
  static internal(message?: string): DomainError {
    return new DomainError(ErrorKind.INTERNAL, message || 'Internal server error');
  }
}
