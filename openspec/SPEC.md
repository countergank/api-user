# API User - Specification

This document contains the authoritative specifications for all domains in the api-user project.

---

## Domain: password-validation

### Overview
Password strength validation with 8 security rules enforced on user registration and password change endpoints.

### Requirements

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

### Scenarios

#### Scenario: Register user with valid password
- **Given**: User provides valid password meeting all 8 rules
- **When**: POST /auth/register is called
- **Then**: User is created successfully

#### Scenario: Register user with weak password
- **Given**: User provides password that violates one or more rules
- **When**: POST /auth/register is called
- **Then**: Validation error returned with specific violation details

#### Scenario: Change password with valid password
- **Given**: Authenticated user provides valid new password
- **When**: POST /users/change-password is called
- **Then**: Password is updated successfully

#### Scenario: Change password with weak password
- **Given**: Authenticated user provides invalid new password
- **When**: POST /users/change-password is called
- **Then**: Validation error returned with specific violation details

### Error Codes

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

### Affected Endpoints

| Endpoint | DTO | Validation |
|----------|-----|------------|
| POST /auth/register | RegisterUserDTO | ✅ @PasswordStrength() |
| POST /users/change-password | ChangePasswordDTO | ✅ @PasswordStrength() |
| POST /admin/users | CreateUserDTO | ✅ @PasswordStrength() |

### Implementation

- **Validator**: `src/common/validators/password-strength.validator.ts`
- **Interface**: `src/common/interfaces/password-validation.interface.ts`
- **Decorator**: `src/common/decorators/password-strength.decorator.ts`

---

## Domain: rbac

### Overview
Role-Based Access Control with three roles: USER, ADMIN, VIEWER.

*(To be documented)*

---

## Domain: auth-login

### Overview
Authentication with JWT tokens.

*(To be documented)*

---

## Domain: user-profile

### Overview
User profile management and password change.

*(To be documented)*

---

## Domain: api-documentation

### Overview
OpenAPI/Swagger documentation.

*(To be documented)*

---

## Domain: error-handling

### Overview
Global error handling patterns.

*(To be documented)*

---

## Domain: config-validation

### Overview
Configuration validation at startup.

*(To be documented)*

---

## Domain: guards

### Overview
Authorization guards for role-based access.

*(To be documented)*

---

## Domain: nestjs-architecture

### Overview
NestJS architecture patterns and conventions.

*(To be documented)*

---

## Metadata

| Property | Value |
|----------|-------|
| Last Updated | 2026-04-27 |
| Total Domains | 9 |
| Fully Documented | 1 (password-validation) |