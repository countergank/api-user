# Tasks: feature/fortaleza-password

## Design Decisions

| # | Pregunta | Decisión |
|---|---------|---------|
| 1 | ¿Hints de requisitos en errores? | **SÍ** |
| 2 | ¿Secuencias case-sensitive? | **NO** (normalize lowercase) |
| 3 | ¿Loguear intentos fallidos? | **SÍ** |

## New Files

- [ ] **Create `src/common/interfaces/password-validation.interface.ts`**
  - Define `PasswordValidationError` interface
  - Define `PASSWORD_ERROR_CODES` constants
  - Define `PASSWORD_RULES` configuration
  - Include hint text in English and Spanish

- [ ] **Create `src/common/validators/password-strength.validator.ts`**
  - Create `PasswordStrengthValidator` implementing `ValidatorConstraintInterface`
  - Implement Rule 1: Min 8 chars
  - Implement Rule 2: At least 1 lowercase
  - Implement Rule 3: At least 1 uppercase
  - Implement Rule 4: At least 1 number
  - Implement Rule 5: At least 1 special char (@$!%*?&)
  - Implement Rule 6: Max 64 chars
  - Implement Rule 7: No consecutive repeated chars
  - Implement Rule 8: No common sequences (case-insensitive)
  - Return all validation errors (not just first)
  - Add security logging on validation failure

- [ ] **Create `src/common/decorators/password-strength.decorator.ts`**
  - Create `@PasswordStrength()` decorator using `registerDecorator`
  - Make it reusable for any password field

- [ ] **Create `src/user/dto/change-password.dto.ts`**
  - Fields: `currentPassword` (string), `newPassword` (string)
  - Apply `@PasswordStrength()` to `newPassword`
  - Add validation messages in Spanish

## Modified Files

- [ ] **Modify `src/user/dto/create-user.dto.ts`**
  - Add `@PasswordStrength()` decorator to `password` field
  - Update error message to Spanish

- [ ] **Modify `src/user/controller/user-profile.controller.ts`**
  - Use `ChangePasswordDTO` instead of inline body parameters
  - Update Swagger documentation if applicable

- [ ] **Modify validator to include hints**
  - Add `passwordRequirements` hint in error response
  - Format: "La contraseña debe tener: mínimo 8 caracteres, mayúsculas, minúsculas, números, caracteres especiales (@$!%*?&)"

- [ ] **Add security logging**
  - Log failed password validation attempts
  - Include: timestamp, userId (if authenticated), IP, validation errors

## Testing

### Unit Tests

- [ ] **Test `PasswordStrengthValidator`** — valid passwords pass
  - "Password123@" → passes
  - "MyP@ssw0rd!" → passes

- [ ] **Test `PasswordStrengthValidator`** — invalid passwords fail
  - "short" → fails (too short)
  - "PASSWORD123@" → fails (no lowercase)
  - "password123@" → fails (no uppercase)
  - "PasswordABC@" → fails (no number)
  - "Password123" → fails (no special char)
  - "Pass@12345abcd" → fails (too long, 64+ chars)
  - "P@ssword123@" → fails (consecutive "ss")
  - "User123@abc" → fails (common sequence "abc")

- [ ] **Test all 8 rules return correct error codes**

- [ ] **Test decorator registration**
  - Verify decorator properly registers validator

### Integration Tests

- [ ] **Test `CreateUserDTO` validation**
  - Valid password → no errors
  - Invalid password → returns all applicable error codes

- [ ] **Test `ChangePasswordDTO` validation**
  - Valid newPassword → no errors
  - Invalid newPassword → returns errors
  - Same validations as CreateUserDTO

### E2E Tests

- [ ] **Test `POST /auth/register`**
  - Valid data → 201 Created
  - Weak password → 400 BadRequest with error codes
  - Verify error response includes hints

- [ ] **Test `POST /users/change-password`**
  - Valid current + new password → 200 OK
  - Weak new password → 400 BadRequest with error codes
  - Invalid current password → 400/401

## API Error Response Format

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "code": "PASSWORD_TOO_SHORT",
      "message": "La contraseña debe tener al menos 8 caracteres"
    },
    {
      "code": "PASSWORD_NO_UPPERCASE",
      "message": "La contraseña debe contener al menos una letra mayúscula"
    }
  ],
  "hints": {
    "password": "La contraseña debe tener: mínimo 8 caracteres, máximo 64, al menos una mayúscula, una minúscula, un número y un carácter especial (@$!%*?&)"
  }
}
```

## Verification Checklist

- [ ] All 8 validation rules implemented and tested
- [ ] Error codes match spec
- [ ] Messages in Spanish
- [ ] Hints included in error responses
- [ ] Security logging implemented
- [ ] Unit tests: 100% coverage on validator
- [ ] Integration tests: DTO validation
- [ ] E2E tests: API endpoints
- [ ] No TypeScript errors
- [ ] All tests pass (`npm test`)