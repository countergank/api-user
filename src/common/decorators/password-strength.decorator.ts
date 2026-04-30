/**
 * Password Strength Decorator
 *
 * Decorator that applies password strength validation to a password field.
 * Usage:
 *
 * ```typescript
 * export class CreateUserDto {
 *   @PasswordStrength()
 *   password: string;
 * }
 * ```
 */

import { registerDecorator, ValidationOptions } from 'class-validator';
import { PasswordStrengthValidator } from '../validators/password-strength.validator';

export function PasswordStrength(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'passwordStrength',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: PasswordStrengthValidator,
    });
  };
}
