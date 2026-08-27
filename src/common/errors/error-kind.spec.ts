import { DomainError } from './domain.error';
import { ErrorKind, ErrorKindName } from './error-kind';

/**
 * Expected values for the 20 new ErrorKind entries added by COU-209.
 * Source of truth: design.md "ErrorKind code assignment" table.
 */
const NEW_KINDS: Array<[ErrorKindName, { group: string; code: string; statusCode: number; defaultMessage: string }]> = [
  [
    'EMAIL_OR_USERNAME_EXISTS',
    { group: 'AUTH', code: 'UA-AUTH-001', statusCode: 409, defaultMessage: 'Email or username already exists' },
  ],
  [
    'INVALID_CREDENTIALS',
    { group: 'AUTH', code: 'UA-AUTH-002', statusCode: 401, defaultMessage: 'Invalid credentials' },
  ],
  [
    'ACCOUNT_LOCKED',
    {
      group: 'AUTH',
      code: 'UA-AUTH-003',
      statusCode: 423,
      defaultMessage:
        'Account is temporarily locked due to too many failed login attempts. Please try again later or contact support.',
    },
  ],
  [
    'ACCOUNT_INACTIVE',
    { group: 'AUTH', code: 'UA-AUTH-004', statusCode: 401, defaultMessage: 'User account is inactive' },
  ],
  [
    'EXPIRED_RESET_TOKEN',
    { group: 'AUTH', code: 'UA-AUTH-005', statusCode: 400, defaultMessage: 'Invalid or expired reset token' },
  ],
  [
    'EXPIRED_VERIFICATION_TOKEN',
    { group: 'AUTH', code: 'UA-AUTH-006', statusCode: 400, defaultMessage: 'Invalid or expired verification token' },
  ],
  [
    'EXPIRED_CONFIRMATION_TOKEN',
    { group: 'AUTH', code: 'UA-AUTH-007', statusCode: 400, defaultMessage: 'Invalid or expired confirmation token' },
  ],
  [
    'NO_PENDING_EMAIL_CHANGE',
    { group: 'AUTH', code: 'UA-AUTH-008', statusCode: 400, defaultMessage: 'No pending email change found' },
  ],
  ['INVALID_TOKEN', { group: 'SEC', code: 'UA-SEC-001', statusCode: 401, defaultMessage: 'Invalid or expired token' }],
  [
    'INVALID_REFRESH_TOKEN',
    { group: 'AUTH', code: 'UA-AUTH-009', statusCode: 401, defaultMessage: 'Invalid refresh token' },
  ],
  [
    'CURRENT_PASSWORD_INCORRECT',
    { group: 'USR', code: 'UA-USR-003', statusCode: 400, defaultMessage: 'Current password is incorrect' },
  ],
  [
    'EMAIL_ALREADY_EXISTS',
    { group: 'USR', code: 'UA-USR-004', statusCode: 409, defaultMessage: 'Email is already registered' },
  ],
  ['FORBIDDEN', { group: 'SEC', code: 'UA-SEC-002', statusCode: 403, defaultMessage: 'Access denied' }],
  [
    'TEMPLATE_SLUG_ALREADY_EXISTS',
    { group: 'EML', code: 'UA-EML-001', statusCode: 409, defaultMessage: 'Template with this slug already exists' },
  ],
  ['TEMPLATE_NOT_FOUND', { group: 'EML', code: 'UA-EML-002', statusCode: 404, defaultMessage: 'Template not found' }],
  [
    'TEMPLATE_FILE_NOT_FOUND',
    { group: 'EML', code: 'UA-EML-003', statusCode: 400, defaultMessage: 'Default template file not found' },
  ],
  ['PARAMETER_NOT_FOUND', { group: 'PAR', code: 'UA-PAR-001', statusCode: 404, defaultMessage: 'Parameter not found' }],
  [
    'PARAMETER_OVERRIDDEN',
    { group: 'PAR', code: 'UA-PAR-002', statusCode: 409, defaultMessage: 'Parameter is overridden by environment' },
  ],
  [
    'PARAMETER_VALUE_INVALID',
    { group: 'PAR', code: 'UA-PAR-003', statusCode: 422, defaultMessage: 'Invalid value for parameter' },
  ],
  [
    'MICROSERVICE_UNAVAILABLE',
    { group: 'APP', code: 'UA-APP-003', statusCode: 503, defaultMessage: 'Microservice unavailable' },
  ],
];

describe('ErrorKind registry — COU-209 new entries', () => {
  it.each(NEW_KINDS)('%s resolves via DomainError.fromKind with matching kind', (kind, expected) => {
    const error = DomainError.fromKind(kind);

    expect(error).toBeInstanceOf(DomainError);
    expect(error.kind.kind).toBe(kind);
  });

  it.each(NEW_KINDS)('%s carries the design-mandated group/code/statusCode/defaultMessage', (kind, expected) => {
    const entry = ErrorKind[kind];

    expect(entry.group).toBe(expected.group);
    expect(entry.code).toBe(expected.code);
    expect(entry.statusCode).toBe(expected.statusCode);
    expect(entry.defaultMessage).toBe(expected.defaultMessage);
  });

  it('keeps the registry at 29 kinds (9 pre-existing + 20 new)', () => {
    expect(Object.keys(ErrorKind)).toHaveLength(29);
  });

  it('keeps every ErrorKind code unique across the whole registry (UA-{GROUP}-{CODE})', () => {
    const codes = Object.values(ErrorKind).map((entry) => entry.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('preserves the 9 pre-existing kinds with their original codes', () => {
    const existing = [
      ['INTERNAL', 'UA-COM-001'],
      ['APP_ERROR', 'UA-APP-001'],
      ['APP_VERSION_NOT_FOUND', 'UA-APP-002'],
      ['ENTITY_NOT_FOUND', 'UA-COM-002'],
      ['ENTITY_NAME_ALREADY_EXISTS', 'UA-COM-003'],
      ['ENTITY_EMAIL_ALREADY_EXISTS', 'UA-COM-004'],
      ['USER_NOT_FOUND', 'UA-USR-001'],
      ['USER_ALREADY_DELETED', 'UA-USR-002'],
      ['VALIDATION_ERROR', 'UA-COM-005'],
    ] as const;

    for (const [kind, code] of existing) {
      expect(ErrorKind[kind].code).toBe(code);
      expect(DomainError.fromKind(kind).kind.kind).toBe(kind);
    }
  });
});
