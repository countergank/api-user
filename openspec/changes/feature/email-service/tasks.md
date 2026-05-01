# Tasks: Email Service with Resend/SMTP and DB Templates

**Change**: `feature/email-service-resend-and-google`
**Project**: api-user

---

## Phase 1: Foundation — Entities, DTOs, Interfaces

- [x] 1.1 Create `EmailTemplate` entity (`src/email/entities/email-template.entity.ts`)
- [x] 1.2 Create `EmailLog` entity (`src/email/entities/email-log.entity.ts`)
- [x] 1.3 Create `EmailProvider` interface (`src/email/interfaces/email-provider.interface.ts`)
- [x] 1.4 Create `CreateTemplateDto` (`src/email/dto/create-template.dto.ts`)
- [x] 1.5 Create `UpdateTemplateDto` (`src/email/dto/update-template.dto.ts`)
- [x] 1.6 Create `SendEmailDto` (`src/email/dto/send-email.dto.ts`)
- [x] 1.7 Create `SendDirectEmailDto` (`src/email/dto/send-direct-email.dto.ts`)
- [x] 1.8 Extend `EnvironmentVariables` with email env vars (`src/config/env.validation.ts`)

## Phase 2: Providers — Resend and SMTP Implementations

- [x] 2.1 Create `ResendProvider` (`src/email/providers/resend.provider.ts`)
- [x] 2.2 Create `SmtpProvider` (`src/email/providers/smtp.provider.ts`)
- [x] 2.3 Create `createEmailProvider()` factory function (`src/email/email.provider.factory.ts`)
- [x] 2.4 Default: `smtp` for local/development, `resend` for staging/production

## Phase 3: Template Management — CRUD + Resolution

- [x] 3.1 Create `EmailTemplateRepository` (`src/email/repository/email-template.repository.ts`)
- [x] 3.2 Create `EmailTemplateService` (`src/email/service/email-template.service.ts`)
- [x] 3.3 Implement default template seeding on module init
- [x] 3.4 Create default HTML templates (`templates/defaults/*.html`)
- [x] 3.5 Create `EmailTemplateController` with CRUD endpoints (admin only)
- [x] 3.6 Swagger docs for template endpoints

## Phase 4: Email Service — Orchestrator + Async Dispatch

- [x] 4.1 Create `EmailLogRepository` (`src/email/repository/email-log.repository.ts`)
- [x] 4.2 Create `EmailService` with `sendBySlug()` and `sendDirect()` async dispatch
- [x] 4.3 Implement EventEmitter listener for async email send
- [x] 4.4 Implement email log creation and update on send attempt
- [x] 4.5 Create `EmailController` with send endpoints (admin only)
- [x] 4.6 Swagger docs for email endpoints

## Phase 5: Swagger Documentation

- [x] 5.1 Create `api-docs/` structure for email module
- [x] 5.2 Add Swagger decorators to auth verification endpoints
- [x] 5.3 Add `ApplyChangeEmailDoc` to user-profile decorator
- [x] 5.4 Apply decorators to all new endpoints

## Phase 6: User Entity Extensions

- [x] 6.1 Add `emailVerificationToken`, `emailVerificationExpires` to User entity
- [x] 6.2 Add `pendingEmail`, `pendingEmailToken`, `pendingEmailExpires` to User entity
- [x] 6.3 Add `UserRepository` methods: `findByEmailVerificationToken`, `findByPendingEmailToken`
- [x] 6.4 Add `UserService` methods: same as repository

## Phase 7: Access Control & Security

- [x] 7.1 Protect all email endpoints with `@Roles(UserRole.ADMIN)`
- [x] 7.2 Add `ApiForbiddenResponse` to all Swagger docs
- [x] 7.3 Remove `.env.development` from `.gitignore` exception
- [x] 7.4 Add `.env.local` to `.gitignore`

## Phase 8: Seed & Environment

- [x] 8.1 Create `seed-email-templates.ts` seed script
- [x] 8.2 Add `npm run seed:email-templates` to `package.json`
- [x] 8.3 Update `npm run seed:all` to include email templates
- [x] 8.4 Update `.env.example` with email config placeholders
- [x] 8.5 Update `.env.development` with real credentials (NOT tracked by git)

## Phase 9: Validation & Polish

- [x] 9.1 Type check passes (0 errors)
- [x] 9.2 All existing tests pass (99 passed)
- [x] 9.3 Circular dependency resolved with `forwardRef`
- [x] 9.4 `EmailProvider` interface fixed with injection token
- [x] 9.5 Linting clean on new code

## Phase 10: Event-Driven Refactoring (COMPLETED — AD-9)

- [x] 10.1 Create email event constants (`src/email/constants/email.events.ts`)
  - `USER_REGISTERED`, `FORGOT_PASSWORD`, `PASSWORD_CHANGED`, `EMAIL_CHANGE_REQUESTED`, `EMAIL_CHANGE_CONFIRMED`, `RESEND_VERIFICATION`
- [x] 10.2 Create TypeScript interfaces for each event payload
  - `src/email/interfaces/email-events.interface.ts`
- [x] 10.3 Create `EmailListener` (`src/email/listeners/email.listener.ts`) with `@OnEvent()` handlers
- [x] 10.4 Register `EmailListener` in `EmailModule` providers
- [x] 10.5 Modify `AuthService` to emit events instead of calling `EmailService`
  - `register()` → emit `USER_REGISTERED`
  - `forgotPassword()` → emit `FORGOT_PASSWORD`
  - `resetPassword()` → emit `PASSWORD_CHANGED` (with hashed password)
  - `confirmEmailChange()` → emit `EMAIL_CHANGE_CONFIRMED`
  - `resendVerification()` → emit `RESEND_VERIFICATION`
- [x] 10.6 Remove `EmailService` injection from `AuthService`
- [x] 10.7 Remove `EmailModule` import from `AuthModule`
- [x] 10.8 Remove `forwardRef` from `AuthModule` ↔ `UserModule` circular dependency
- [x] 10.9 Update `UserProfileController` to emit `PASSWORD_CHANGED` event
- [x] 10.10 Verify type check passes
- [x] 10.11 Verify all tests pass (99 unit + 32 e2e)
- [x] 10.12 Run linting and formatting
