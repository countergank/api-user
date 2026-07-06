# Archived: email-service

Completed on: 2026-05-01

## Summary
- Implemented multi-provider email service (SMTP + Resend) with DB-driven templates
- Event-driven architecture: AuthService emits events, EmailListener handles them
- Eliminated circular dependency between AuthModule ↔ EmailModule
- Password reset now properly hashes passwords using pre-save hooks
- All 131 tests passing (99 unit + 32 e2e)
- Type check clean (0 errors)

## Key Decisions
- AD-9: Event-driven architecture with EventEmitter2
- AD-10: Injection token (string) for EmailProvider
- AD-11: Breaking circular dependency (no forwardRef needed)
- AD-12: Password hashing via UserService.hashPassword() before reset

## Files Changed
- `src/email/` — Complete email module (entities, services, controllers, providers)
- `src/auth/auth.service.ts` — Event emission instead of direct EmailService calls
- `src/auth/auth.controller.ts` — Added @HttpCode(200) for forgot-password
- `src/user/service/user.service.ts` — Added hashPassword() method
- `src/user/repository/user.repository.ts` — update() uses .save() for password hashing
- `src/user/controller/user-profile.controller.ts` — Emits PASSWORD_CHANGED event
- `test/` — All e2e tests updated and passing
- `.openspec/changes/feature/email-service/` — All artifacts updated

## Notes
- Gmail SMTP requires App Password (16-char) generated from Google Account
- Event-driven pattern eliminates circular dependencies
- ValidationPipe must be applied in e2e tests via createTestApp() helper
- Password strength validator returns array of error codes (not single string)
