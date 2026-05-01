/**
 * Password Validation Interface and Constants
 *
 * Contains error codes, rules configuration, and hints for password strength validation.
 */

export interface PasswordValidationError {
  code: string;
  message: string;
}

export const PASSWORD_ERROR_CODES = {
  MIN_LENGTH: 'PASSWORD_TOO_SHORT',
  MAX_LENGTH: 'PASSWORD_TOO_LONG',
  LOWERCASE: 'PASSWORD_NO_LOWERCASE',
  UPPERCASE: 'PASSWORD_NO_UPPERCASE',
  NUMBER: 'PASSWORD_NO_NUMBER',
  SPECIAL_CHAR: 'PASSWORD_NO_SPECIAL',
  CONSECUTIVE: 'PASSWORD_REPEATED_CHARS',
  SEQUENCE: 'PASSWORD_COMMON_SEQUENCE',
} as const;

export const PASSWORD_RULES = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 64,
  SPECIAL_CHARS: '@$!%*?&',
  COMMON_SEQUENCES: ['123', 'abc', 'qwe', 'asd', 'zxc'],
} as const;

export const PASSWORD_MESSAGES = {
  [PASSWORD_ERROR_CODES.MIN_LENGTH]: {
    es: 'La contraseña debe tener al menos 8 caracteres',
    en: 'Password must have at least 8 characters',
  },
  [PASSWORD_ERROR_CODES.MAX_LENGTH]: {
    es: 'La contraseña no puede exceder 64 caracteres',
    en: 'Password cannot exceed 64 characters',
  },
  [PASSWORD_ERROR_CODES.LOWERCASE]: {
    es: 'La contraseña debe contener al menos una letra minúscula',
    en: 'Password must contain at least one lowercase letter',
  },
  [PASSWORD_ERROR_CODES.UPPERCASE]: {
    es: 'La contraseña debe contener al menos una letra mayúscula',
    en: 'Password must contain at least one uppercase letter',
  },
  [PASSWORD_ERROR_CODES.NUMBER]: {
    es: 'La contraseña debe contener al menos un número',
    en: 'Password must contain at least one number',
  },
  [PASSWORD_ERROR_CODES.SPECIAL_CHAR]: {
    es: 'La contraseña debe contener al menos un carácter especial (@$!%*?&)',
    en: 'Password must contain at least one special character (@$!%*?&)',
  },
  [PASSWORD_ERROR_CODES.CONSECUTIVE]: {
    es: 'La contraseña no puede tener caracteres consecutivos repetidos',
    en: 'Password cannot have consecutive repeated characters',
  },
  [PASSWORD_ERROR_CODES.SEQUENCE]: {
    es: 'La contraseña no puede contener secuencias comunes como 123, abc, qwe, asd, zxc',
    en: 'Password cannot contain common sequences like 123, abc, qwe, asd, zxc',
  },
} as const;

export const PASSWORD_HINTS = {
  es: 'La contraseña debe tener: mínimo 8 caracteres, máximo 64, al menos una mayúscula, una minúscula, un número y un carácter especial (@$!%*?&)',
  en: 'Password must have: minimum 8 characters, maximum 64, at least one uppercase, one lowercase, one number and one special character (@$!%*?&)',
} as const;
