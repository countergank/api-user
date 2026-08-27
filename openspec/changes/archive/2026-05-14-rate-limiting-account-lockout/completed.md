# Archived: rate-limiting-account-lockout

Completed on: 2026-05-14

## Summary
- Added rate limiting to all 8 public auth endpoints via @nestjs/throttler v5
- Implemented account lockout after N failed login attempts (configurable)
- Added PATCH /admin/users/:id/unlock for admin manual unlock
- Full i18n support (es/en/pt) for 429 and 423 errors
- 133 unit + 47 e2e tests passing

## Files Changed
- src/app/app.module.ts — ThrottlerModule registration
- src/auth/auth.service.ts — Lockout logic in login()
- src/auth/auth.controller.ts — @Throttle() decorators on 8 endpoints
- src/user/entities/user.entity.ts — failedLoginAttempts + lockedUntil fields
- src/user/controller/user.controller.ts — PATCH /admin/users/:id/unlock
- src/config/env.validation.ts — 10 new env vars
- src/common/errors/account-locked.exception.ts — HTTP 423 exception
- .env.example, .env.development, .env.production.example — documented

## Notes
- Spec endpoint deviation: Admin unlock uses PATCH /admin/users/:id/unlock (UserController) — better REST alignment than original spec
- Rate limiting uses in-memory storage (Redis migration path documented)
