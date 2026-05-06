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
    es: 'La contraseña debe tener al menos8 caracteres',
    en: 'Password must have at least 8 characters',
    pt: 'A senha deve ter pelo menos 8 caracteres',
  },
  [PASSWORD_ERROR_CODES.MAX_LENGTH]: {
    es: 'La contraseña no puede exceder 64 caracteres',
    en: 'Password cannot exceed 64 characters',
    pt: 'A senha não pode exceder 64 caracteres',
  },
  [PASSWORD_ERROR_CODES.LOWERCASE]: {
    es: 'La contraseña debe contener al menos una letra minúscula',
    en: 'Password must contain at least one lowercase letter',
    pt: 'A senha deve conter pelo menos uma letra minúscula',
  },
  [PASSWORD_ERROR_CODES.UPPERCASE]: {
    es: 'La contraseña debe contener al menos una letra mayúscula',
    en: 'Password must contain at least one uppercase letter',
    pt: 'A senha deve conter pelo menos uma letra maiúscula',
  },
  [PASSWORD_ERROR_CODES.NUMBER]: {
    es: 'La contraseña debe contener al menos un número',
    en: 'Password must contain at least one number',
    pt: 'A senha deve conter pelo menos um número',
  },
  [PASSWORD_ERROR_CODES.SPECIAL_CHAR]: {
    es: 'La contraseña debe contener al menos un carácter no alfanumérico',
    en: 'Password must contain at least one non-alphanumeric character',
    pt: 'A senha deve conter pelo menos um caractere não alfanumérico',
  },
  [PASSWORD_ERROR_CODES.CONSECUTIVE]: {
    es: 'La contraseña no puede tener caracteres consecutivos repetidos',
    en: 'Password cannot have consecutive repeated characters',
    pt: 'A senha não pode ter caracteres consecutivos repetidos',
  },
  [PASSWORD_ERROR_CODES.SEQUENCE]: {
    es: 'La contraseña no puede contener secuencias comunes como 123, abc, qwe, asd, zxc',
    en: 'Password cannot contain common sequences like 123, abc, qwe, asd, zxc',
    pt: 'A senha não pode conter sequências comuns como 123, abc, qwe, asd, zxc',
  },
} as const;

export const PASSWORD_HINTS = {
  es: 'La contraseña debe tener: mínimo 8 caracteres, máximo 64, al menos una mayúscula, una minúscula, un número y un carácter no alfanumérico',
  en: 'Password must have: minimum 8 characters, maximum 64, at least one uppercase, one lowercase, one number and one non-alphanumeric character',
  pt: 'A senha deve ter: mínimo 8 caracteres, máximo 64, pelo menos uma maiúscula, uma minúscula, um número e um caractere não alfanumérico',
} as const;
