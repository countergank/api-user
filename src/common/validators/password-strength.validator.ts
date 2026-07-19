/**
 * Password Strength Validator
 *
 * Custom class-validator constraint that enforces 8 password strength rules:
 * 1. Minimum 8 characters
 * 2. At least 1 lowercase letter
 * 3. At least 1 uppercase letter
 * 4. At least 1 number
 * 5. At least 1 special character (@$!%*?&)
 * 6. Maximum 64 characters
 * 7. No consecutive repeated characters
 * 8. No common sequences (123, abc, qwe, asd, zxc)
 */

import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  ValidationError,
} from 'class-validator';
import { Logger } from '@nestjs/common';
import { PASSWORD_ERROR_CODES, PASSWORD_RULES, PASSWORD_MESSAGES } from '../interfaces/password-validation.interface';

@ValidatorConstraint({ name: 'passwordStrength', async: false })
export class PasswordStrengthValidator implements ValidatorConstraintInterface {
  private readonly logger = new Logger(PasswordStrengthValidator.name);

  validate(password: string): boolean {
    const errors = this.validatePassword(password);

    // Store errors in a way that can be accessed by defaultMessage
    // We use a WeakMap to store errors per validation instance
    if (errors.length > 0) {
      (this as any).__validationErrors = errors;
      return false;
    }

    return true;
  }

  /**
   * Returns all validation errors for a given password
   */
  validatePassword(password: string): string[] {
    const errors: string[] = [];

    // Rule 1: Min 8 chars
    if (password.length < PASSWORD_RULES.MIN_LENGTH) {
      errors.push(PASSWORD_ERROR_CODES.MIN_LENGTH);
    }

    // Rule 2: At least 1 lowercase
    if (!/[a-z]/.test(password)) {
      errors.push(PASSWORD_ERROR_CODES.LOWERCASE);
    }

    // Rule 3: At least 1 uppercase
    if (!/[A-Z]/.test(password)) {
      errors.push(PASSWORD_ERROR_CODES.UPPERCASE);
    }

    // Rule 4: At least 1 number
    if (!/[0-9]/.test(password)) {
      errors.push(PASSWORD_ERROR_CODES.NUMBER);
    }

    // Rule 5: At least 1 non-alphanumeric character
    if (!/[^a-zA-Z0-9]/.test(password)) {
      errors.push(PASSWORD_ERROR_CODES.SPECIAL_CHAR);
    }

    // Rule 6: Max 64 chars
    if (password.length > PASSWORD_RULES.MAX_LENGTH) {
      errors.push(PASSWORD_ERROR_CODES.MAX_LENGTH);
    }

    // Rule 7: No consecutive repeated chars (e.g., "aa", "11", "!!")
    // The regex (.)\1 matches any character followed by itself (e.g., "aa")
    if (/(.)\1/.test(password)) {
      errors.push(PASSWORD_ERROR_CODES.CONSECUTIVE);
    }

    // Rule 8: No common sequences (case-insensitive)
    // We check the password in lowercase against known sequences
    const lowerPass = password.toLowerCase();
    for (const seq of PASSWORD_RULES.COMMON_SEQUENCES) {
      if (lowerPass.includes(seq)) {
        errors.push(PASSWORD_ERROR_CODES.SEQUENCE);
        break; // Only report once, not once per sequence found
      }
    }

    // Log failed validation attempts for security monitoring
    if (errors.length > 0) {
      this.logger.warn({
        context: 'PasswordValidationFailed',
        errors: errors,
      });
    }

    return errors;
  }

  defaultMessage(_args: ValidationArguments): string {
    const errors: string[] = (this as any).__validationErrors || [];

    if (errors.length > 0) {
      // Return ALL error codes joined — ErrorFilter will split & translate each
      return errors.join('|');
    }

    return 'PASSWORD_INVALID';
  }

  /**
   * Build full error response with all validation failures
   */
  buildErrors(password: string): ValidationError[] {
    const errorCodes = this.validatePassword(password);

    return errorCodes.map((code) => {
      const validationError = new ValidationError();
      validationError.property = 'password';
      // Return the translation key - ErrorFilter will translate using I18nService
      validationError.constraints = {
        passwordStrength: `validation.${PASSWORD_MESSAGES[code]?.es || code}`,
      };
      validationError.children = [];
      return validationError;
    });
  }
}
