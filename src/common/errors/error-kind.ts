/**
 * ErrorKind — single source of truth for domain errors.
 *
 * Each entry defines:
 * - `kind` — stable machine-readable identifier
 * - `group` — error group (COM, USR, APP, etc.)
 * - `code` — UA-{GROUP}-{CODE} format error code
 * - `statusCode` — HTTP status code
 * - `defaultMessage` — fallback human-readable message
 *
 * Usage: `DomainError.fromKind('USER_NOT_FOUND')`
 */
export const ErrorKind = {
  // ── Common (COM) ─────────────────────────────────────────
  INTERNAL: {
    kind: 'INTERNAL',
    group: 'COM',
    code: 'UA-COM-001',
    statusCode: 500,
    defaultMessage: 'Internal server error',
  },
  APP_ERROR: {
    kind: 'APP_ERROR',
    group: 'APP',
    code: 'UA-APP-001',
    statusCode: 500,
    defaultMessage: 'Application error',
  },
  APP_VERSION_NOT_FOUND: {
    kind: 'APP_VERSION_NOT_FOUND',
    group: 'APP',
    code: 'UA-APP-002',
    statusCode: 404,
    defaultMessage: 'App version not found',
  },
  ENTITY_NOT_FOUND: {
    kind: 'ENTITY_NOT_FOUND',
    group: 'COM',
    code: 'UA-COM-002',
    statusCode: 404,
    defaultMessage: 'Entity not found',
  },
  ENTITY_NAME_ALREADY_EXISTS: {
    kind: 'ENTITY_NAME_ALREADY_EXISTS',
    group: 'COM',
    code: 'UA-COM-003',
    statusCode: 409,
    defaultMessage: 'Name already exists',
  },
  ENTITY_EMAIL_ALREADY_EXISTS: {
    kind: 'ENTITY_EMAIL_ALREADY_EXISTS',
    group: 'COM',
    code: 'UA-COM-004',
    statusCode: 409,
    defaultMessage: 'Email already exists',
  },
  USER_NOT_FOUND: {
    kind: 'USER_NOT_FOUND',
    group: 'USR',
    code: 'UA-USR-001',
    statusCode: 404,
    defaultMessage: 'User not found',
  },
  USER_ALREADY_DELETED: {
    kind: 'USER_ALREADY_DELETED',
    group: 'USR',
    code: 'UA-USR-002',
    statusCode: 410,
    defaultMessage: 'User already deleted',
  },
  VALIDATION_ERROR: {
    kind: 'VALIDATION_ERROR',
    group: 'COM',
    code: 'UA-COM-005',
    statusCode: 400,
    defaultMessage: 'Validation failed',
  },
} as const;

export type ErrorKindName = keyof typeof ErrorKind;
export type ErrorKindEntry = (typeof ErrorKind)[ErrorKindName];
