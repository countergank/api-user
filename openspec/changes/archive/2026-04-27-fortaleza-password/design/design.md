# Design: feature/fortaleza-password

## Technical Approach

Implement password strength validation using NestJS custom validators with class-validator. Create a reusable `@PasswordStrength()` decorator that enforces 8 security rules, applying it to password fields in `CreateUserDTO` and a new `ChangePasswordDTO`. Validation errors return structured messages following the project's existing error handling pattern.

## Architecture Decisions

| Decision | Tradeoff | Choice |
|----------|----------|--------|
| Validator pattern | Custom class-validator constraint vs pipe-based validation | **Custom ValidatorConstraint** — follows project's existing class-validator pattern in DTOs |
| Error format | Single error vs multiple errors per validation | **Multiple errors** — return all validation failures at once for better UX |
| Decorator scope | Reusable decorator vs inline validation | **Reusable `@PasswordStrength()` decorator** — can be applied to any password field |
| Error messages | Spanish vs English vs i18n | **Bilingual (ES/EN)** — matching project's bilingual error convention |
| Sequence validation | Regex patterns vs character-by-character analysis | **Regex with common patterns** — simpler implementation, covers most cases |

## Data Flow

```
Client Request
     │
     ▼
DTO (CreateUserDTO / ChangePasswordDTO)
     │
     ├── @PasswordStrength() decorator
     │        │
     │        ▼
     │   PasswordStrengthValidator
     │        │
     │        ├── Rule 1: Min 8 chars
     │        ├── Rule 2: Lowercase
     │        ├── Rule 3: Uppercase
     │        ├── Rule 4: Number
     │        ├── Rule 5: Special char [@$!%*?&]
     │        ├── Rule 6: Max 64 chars
     │        ├── Rule 7: No consecutive repeats
     │        └── Rule 8: No common sequences
     │
     ▼
Validation Failed? ──YES──▶ BadRequestException (structured errors)
     │
    NO
     ▼
Controller ──▶ Service ──▶ Database
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/common/validators/password-strength.validator.ts` | Create | Validator class implementing `ValidatorConstraintInterface` with all 8 rules |
| `src/common/decorators/password-strength.decorator.ts` | Create | Decorator `@PasswordStrength()` that registers the validator |
| `src/common/interfaces/password-validation.interface.ts` | Create | Constants for error codes and validation rules configuration |
| `src/user/dto/create-user.dto.ts` | Modify | Add `@PasswordStrength()` decorator to `password` field |
| `src/user/dto/change-password.dto.ts` | Create | New DTO with `currentPassword` and `newPassword` (with decorator) |
| `src/user/controller/user-profile.controller.ts` | Modify | Update `changePassword` to use `ChangePasswordDTO` instead of inline body |

## Interfaces / Contracts

```typescript
// src/common/interfaces/password-validation.interface.ts

export interface PasswordValidationError {
  code: string;
  message: string;
}

export const PASSWORD_ERROR_CODES = {
  MIN_LENGTH: 'PASSWORD_MIN_LENGTH',
  MAX_LENGTH: 'PASSWORD_MAX_LENGTH',
  LOWERCASE: 'PASSWORD_NO_LOWERCASE',
  UPPERCASE: 'PASSWORD_NO_UPPERCASE',
  NUMBER: 'PASSWORD_NO_NUMBER',
  SPECIAL_CHAR: 'PASSWORD_NO_SPECIAL_CHAR',
  CONSECUTIVE: 'PASSWORD_CONSECUTIVE_REPEAT',
  SEQUENCE: 'PASSWORD_COMMON_SEQUENCE',
} as const;

export const PASSWORD_RULES = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 64,
  SPECIAL_CHARS: '@$!%*?&',
  COMMON_SEQUENCES: ['123', 'abc', 'qwe', 'asd', 'zxc'],
} as const;
```

```typescript
// src/common/decorators/password-strength.decorator.ts

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
```

## Implementation Details

### Validation Rules Implementation

```typescript
// src/common/validators/password-strength.validator.ts (excerpt)

@ValidatorConstraint({ name: 'passwordStrength', async: false })
export class PasswordStrengthValidator implements ValidatorConstraintInterface {
  validate(password: string, args: ValidationArguments): boolean {
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
    
    // Rule 5: At least 1 special char
    const specialCharRegex = new RegExp(`[${PASSWORD_RULES.SPECIAL_CHARS}]`);
    if (!specialCharRegex.test(password)) {
      errors.push(PASSWORD_ERROR_CODES.SPECIAL_CHAR);
    }
    
    // Rule 6: Max 64 chars
    if (password.length > PASSWORD_RULES.MAX_LENGTH) {
      errors.push(PASSWORD_ERROR_CODES.MAX_LENGTH);
    }
    
    // Rule 7: No consecutive repeated chars
    if (/(.)\1/.test(password)) {
      errors.push(PASSWORD_ERROR_CODES.CONSECUTIVE);
    }
    
    // Rule 8: No common sequences
    const lowerPass = password.toLowerCase();
    for (const seq of PASSWORD_RULES.COMMON_SEQUENCES) {
      if (lowerPass.includes(seq)) {
        errors.push(PASSWORD_ERROR_CODES.SEQUENCE);
        break;
      }
    }
    
    // Store errors for defaultMessage
    (args.object as any).__passwordErrors = errors;
    return errors.length === 0;
  }

  defaultMessage(args: ValidationArguments): string {
    const errors: string[] = (args.object as any).__passwordErrors || [];
    return errors.join(', ');
  }
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Validator logic for all 8 rules | Jest tests with valid/invalid passwords |
| Unit | Decorator registration | Test that decorator properly registers validator |
| Integration | CreateUserDTO validation | Test DTO rejects weak passwords |
| Integration | ChangePasswordDTO validation | Test DTO rejects weak new passwords |
| E2E | POST /auth/register | Verify API returns 400 with error codes |
| E2E | POST /users/change-password | Verify API returns 400 with error codes |

## Migration / Rollout

No migration required for existing users. Password validation only applies to:
- New user registration (`/auth/register`)
- Password changes (`/users/change-password`)

Existing users with weak passwords are not affected until they attempt to change their password.

## Open Questions

- [ ] Should we provide password requirement hints in the API response/error message?
- [ ] Should sequence detection be case-sensitive or normalize to lowercase? (Current design: lowercase)
- [ ] Should we log failed password validation attempts for security monitoring?
