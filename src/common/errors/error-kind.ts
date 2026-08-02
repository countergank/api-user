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
  // ── Auth (AUTH) ────────────────────────────────────────
  EMAIL_OR_USERNAME_EXISTS: {
    kind: 'EMAIL_OR_USERNAME_EXISTS',
    group: 'AUTH',
    code: 'UA-AUTH-001',
    statusCode: 409,
    defaultMessage: 'Email or username already exists',
  },
  INVALID_CREDENTIALS: {
    kind: 'INVALID_CREDENTIALS',
    group: 'AUTH',
    code: 'UA-AUTH-002',
    statusCode: 401,
    defaultMessage: 'Invalid credentials',
  },
  ACCOUNT_LOCKED: {
    kind: 'ACCOUNT_LOCKED',
    group: 'AUTH',
    code: 'UA-AUTH-003',
    statusCode: 423,
    defaultMessage:
      'Account is temporarily locked due to too many failed login attempts. Please try again later or contact support.',
  },
  ACCOUNT_INACTIVE: {
    kind: 'ACCOUNT_INACTIVE',
    group: 'AUTH',
    code: 'UA-AUTH-004',
    statusCode: 401,
    defaultMessage: 'User account is inactive',
  },
  EXPIRED_RESET_TOKEN: {
    kind: 'EXPIRED_RESET_TOKEN',
    group: 'AUTH',
    code: 'UA-AUTH-005',
    statusCode: 400,
    defaultMessage: 'Invalid or expired reset token',
  },
  EXPIRED_VERIFICATION_TOKEN: {
    kind: 'EXPIRED_VERIFICATION_TOKEN',
    group: 'AUTH',
    code: 'UA-AUTH-006',
    statusCode: 400,
    defaultMessage: 'Invalid or expired verification token',
  },
  EXPIRED_CONFIRMATION_TOKEN: {
    kind: 'EXPIRED_CONFIRMATION_TOKEN',
    group: 'AUTH',
    code: 'UA-AUTH-007',
    statusCode: 400,
    defaultMessage: 'Invalid or expired confirmation token',
  },
  NO_PENDING_EMAIL_CHANGE: {
    kind: 'NO_PENDING_EMAIL_CHANGE',
    group: 'AUTH',
    code: 'UA-AUTH-008',
    statusCode: 400,
    defaultMessage: 'No pending email change found',
  },
  INVALID_REFRESH_TOKEN: {
    kind: 'INVALID_REFRESH_TOKEN',
    group: 'AUTH',
    code: 'UA-AUTH-009',
    statusCode: 401,
    defaultMessage: 'Invalid refresh token',
  },
  // ── Security / Guards (SEC) ────────────────────────────
  INVALID_TOKEN: {
    kind: 'INVALID_TOKEN',
    group: 'SEC',
    code: 'UA-SEC-001',
    statusCode: 401,
    defaultMessage: 'Invalid or expired token',
  },
  FORBIDDEN: {
    kind: 'FORBIDDEN',
    group: 'SEC',
    code: 'UA-SEC-002',
    statusCode: 403,
    defaultMessage: 'Access denied',
  },
  // ── User (USR) — continuation ──────────────────────────
  CURRENT_PASSWORD_INCORRECT: {
    kind: 'CURRENT_PASSWORD_INCORRECT',
    group: 'USR',
    code: 'UA-USR-003',
    statusCode: 400,
    defaultMessage: 'Current password is incorrect',
  },
  EMAIL_ALREADY_EXISTS: {
    kind: 'EMAIL_ALREADY_EXISTS',
    group: 'USR',
    code: 'UA-USR-004',
    statusCode: 409,
    defaultMessage: 'Email is already registered',
  },
  // ── Email Template (EML) ───────────────────────────────
  TEMPLATE_SLUG_ALREADY_EXISTS: {
    kind: 'TEMPLATE_SLUG_ALREADY_EXISTS',
    group: 'EML',
    code: 'UA-EML-001',
    statusCode: 409,
    defaultMessage: 'Template with this slug already exists',
  },
  TEMPLATE_NOT_FOUND: {
    kind: 'TEMPLATE_NOT_FOUND',
    group: 'EML',
    code: 'UA-EML-002',
    statusCode: 404,
    defaultMessage: 'Template not found',
  },
  TEMPLATE_FILE_NOT_FOUND: {
    kind: 'TEMPLATE_FILE_NOT_FOUND',
    group: 'EML',
    code: 'UA-EML-003',
    statusCode: 400,
    defaultMessage: 'Default template file not found',
  },
  // ── Parameters (PAR) ───────────────────────────────────
  PARAMETER_NOT_FOUND: {
    kind: 'PARAMETER_NOT_FOUND',
    group: 'PAR',
    code: 'UA-PAR-001',
    statusCode: 404,
    defaultMessage: 'Parameter not found',
  },
  PARAMETER_OVERRIDDEN: {
    kind: 'PARAMETER_OVERRIDDEN',
    group: 'PAR',
    code: 'UA-PAR-002',
    statusCode: 409,
    defaultMessage: 'Parameter is overridden by environment',
  },
  PARAMETER_VALUE_INVALID: {
    kind: 'PARAMETER_VALUE_INVALID',
    group: 'PAR',
    code: 'UA-PAR-003',
    statusCode: 422,
    defaultMessage: 'Invalid value for parameter',
  },
  // ── App (APP) — continuation ───────────────────────────
  MICROSERVICE_UNAVAILABLE: {
    kind: 'MICROSERVICE_UNAVAILABLE',
    group: 'APP',
    code: 'UA-APP-003',
    statusCode: 503,
    defaultMessage: 'Microservice unavailable',
  },
} as const;

export type ErrorKindName = keyof typeof ErrorKind;
export type ErrorKindEntry = (typeof ErrorKind)[ErrorKindName];
