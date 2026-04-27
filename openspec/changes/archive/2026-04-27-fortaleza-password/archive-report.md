# Archive Report: feature/fortaleza-password

**Change**: feature/fortaleza-password
**Date**: 2026-04-27
**Archived to**: `openspec/changes/archive/2026-04-27-fortaleza-password/`

---

## Summary

Password strength validation feature implemented and verified. 8 validation rules enforced on user registration and password change endpoints.

---

## Specs Synced

| Domain | Action | Details |
|--------|--------|---------|
| password-validation | Created | Synced to openspec/SPEC.md |

---

## Archive Contents

- ✅ proposal.md (in engram: #614)
- ✅ specs.md (in engram: #615)  
- ✅ design.md
- ✅ tasks.md (11/11 tasks complete)
- ✅ verify-report.md

---

## Implementation Details

### Files Created
- `src/common/interfaces/password-validation.interface.ts`
- `src/common/validators/password-strength.validator.ts`
- `src/common/decorators/password-strength.decorator.ts`
- `src/user/dto/change-password.dto.ts`
- `src/common/validators/password-strength.validator.spec.ts`
- `src/user/dto/password-validation.integration.spec.ts`
- `test/password-strength.e2e-spec.ts`
- `src/auth/dto/register-user.dto.ts` — DTO para registro público sin campo role

### Files Modified
- `src/user/dto/create-user.dto.ts` — Added @PasswordStrength() decorator, role opcional
- `src/user/controller/user-profile.controller.ts` — Uses ChangePasswordDTO
- `src/user/mocks/create-user-dto.mock.ts` — Updated to valid password
- `src/database/seeds/seed-users.ts` — Updated passwords
- `src/auth/auth.controller.ts` — Uses RegisterUserDTO
- `src/main.ts` — Added global ValidationPipe
- `src/common/errors/error-filter.ts` — Improved validation error messages

### Validation Rules Implemented
1. Minimum 8 characters
2. At least 1 lowercase letter
3. At least 1 uppercase letter
4. At least 1 number
5. At least 1 special character (@$!%*?&)
6. Maximum 64 characters
7. No consecutive repeated characters
8. No common sequences (123, abc, qwe, asd, zxc)

---

## Post-Archive Fixes (2026-04-27)

### Fix 1: ValidationPipe not enabled in production
- **Problem**: Password validation worked in tests but not in production Docker
- **Solution**: Added global ValidationPipe in `src/main.ts`
- **Commit**: `8d0578c`

### Fix 2: Error messages not showing validation details
- **Problem**: API returned generic "Bad Request Exception" 
- **Solution**: Updated `ErrorFilter` to extract validation error messages
- **Commit**: `8bf0143`

### Fix 3: CreateUserDTO used in register (role required)
- **Problem**: /auth/register required role field
- **Solution**: Created `RegisterUserDTO` without role field
- **Commit**: `7d23ab0`

### Fix 4: CreateUserDTO role optional for admin
- **Problem**: Admin endpoint required role field
- **Solution**: Made role optional with default UserRole.USER
- **Commit**: `136f8c0`

---

## Test Results

- **Total tests**: 99
- **Passed**: 99
- **Failed**: 0

---

## Database

- Dropped and re-seeded with new password rules
- Users now use valid passwords: `XyzAdmin1@`, `XyzAdmin2@`, `XyzUser1@`, `XyzViewer1@`

---

## API Endpoints

| Endpoint | DTO | Role |
|----------|-----|------|
| POST /auth/register | RegisterUserDTO | N/A (default: user) |
| POST /users/change-password | ChangePasswordDTO | Validates newPassword |
| POST /admin/users | CreateUserDTO | Optional (default: user) |

---

## SDD Cycle Complete

The change has been fully planned, implemented, verified, and archived.
Ready for the next change.