# password-validation Specification

> Migrated from `openspec/SPEC.md` (deleted 2026-07-06).

## Overview

Password strength validation with 8 security rules enforced on user registration and password change endpoints.

## Requirements

| ID | Requirement | Description |
|----|-------------|-------------|
| REQ-FORT-001 | Min 8 characters | Password MUST be at least 8 characters long |
| REQ-FORT-002 | Lowercase letter | Password MUST contain at least 1 lowercase letter |
| REQ-FORT-003 | Uppercase letter | Password MUST contain at least 1 uppercase letter |
| REQ-FORT-004 | Number | Password MUST contain at least 1 number |
| REQ-FORT-005 | Special character | Password MUST contain at least 1 special character (@$!%*?&) |
| REQ-FORT-006 | Max 64 characters | Password MUST NOT exceed 64 characters |
| REQ-FORT-007 | No consecutive repeats | Password MUST NOT contain 3 or more consecutive repeated characters |
| REQ-FORT-008 | No common sequences | Password MUST NOT contain common sequences (123, abc, qwe, asd, zxc) |

## Scenarios

### Scenario: Register user with valid password
- **Given**: User provides valid password meeting all 8 rules
- **When**: POST /auth/register is called
- **Then**: User is created successfully

### Scenario: Register user with weak password
- **Given**: User provides password that violates one or more rules
- **When**: POST /auth/register is called
- **Then**: Validation error returned with specific violation details

### Scenario: Change password with valid password
- **Given**: Authenticated user provides valid new password
- **When**: POST /users/change-password is called
- **Then**: Password is updated successfully

### Scenario: Change password with weak password
- **Given**: Authenticated user provides invalid new password
- **When**: POST /users/change-password is called
- **Then**: Validation error returned with specific violation details

## Error Codes

| Code | Description |
|------|-------------|
| FORT-001 | Password must be at least 8 characters |
| FORT-002 | Password must contain at least 1 lowercase letter |
| FORT-003 | Password must contain at least 1 uppercase letter |
| FORT-004 | Password must contain at least 1 number |
| FORT-005 | Password must contain at least 1 special character (@$!%*?&) |
| FORT-006 | Password must not exceed 64 characters |
| FORT-007 | Password must not contain 3 or more consecutive repeated characters |
| FORT-008 | Password must not contain common sequences |

## Affected Endpoints

| Endpoint | DTO | Validation |
|----------|-----|------------|
| POST /auth/register | RegisterUserDTO | @PasswordStrength() |
| POST /users/change-password | ChangePasswordDTO | @PasswordStrength() |
| POST /admin/users | CreateUserDTO | @PasswordStrength() |

## Implementation

- **Validator**: `src/common/validators/password-strength.validator.ts`
- **Interface**: `src/common/interfaces/password-validation.interface.ts`
- **Decorator**: `src/common/decorators/password-strength.decorator.ts`
