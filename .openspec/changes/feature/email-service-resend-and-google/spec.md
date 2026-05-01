# Spec: Email Service with Resend/SMTP and DB Templates

**Change**: `feature/email-service-resend-and-google`
**Project**: api-user

---

## S1. Email Provider Interface & Factory

### S1.1 — Provider Contract

**MUST** define an `EmailProvider` interface with a `send` method:
```typescript
interface EmailSendResult { success: boolean; messageId?: string; error?: string }
interface EmailProvider { send(params: EmailSendParams): Promise<EmailSendResult> }
interface EmailSendParams { to: string; subject: string; html: string; from?: string; replyTo?: string }
```

**GIVEN** a class implements `EmailProvider`
**WHEN** `send()` is called with valid `EmailSendParams`
**THEN** it MUST return an `EmailSendResult` with `success`, optional `messageId`, and optional `error`

### S1.2 — Provider Factory Resolution

**GIVEN** `EMAIL_PROVIDER` env var is set to `"resend"` or `"smtp"`
**WHEN** `createEmailProvider()` is called
**THEN** it MUST return the corresponding provider implementation

**GIVEN** `EMAIL_PROVIDER` is not set
**WHEN** `createEmailProvider()` is called
**THEN** it MUST default to `"smtp"` if `NODE_ENV` is `local` or `development`
**AND** it MUST default to `"resend"` if `NODE_ENV` is `staging` or `production`

**GIVEN** `EMAIL_PROVIDER` is set to an unsupported value
**WHEN** `createEmailProvider()` is called
**THEN** it MUST throw an error indicating the unsupported provider

### S1.3 — Provider-Specific Validation

**GIVEN** `EMAIL_PROVIDER=resend`
**WHEN** env validation runs
**THEN** `RESEND_API_KEY` SHOULD be present (runtime error if missing)

**GIVEN** `EMAIL_PROVIDER=smtp`
**WHEN** env validation runs
**THEN** `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, and `EMAIL_PASS` SHOULD be present (runtime error if missing)

### S1.4 — Access Control

**GIVEN** any email endpoint is called
**WHEN** the request is not authenticated or the user does not have `ADMIN` role
**THEN** it MUST return 401 Unauthorized or 403 Forbidden respectively

**GIVEN** `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles(UserRole.ADMIN)` is applied at controller level
**THEN** all email endpoints require admin role

---

## S2. Email Template Management

### S2.1 — Template Entity

**MUST** define an `EmailTemplate` Mongoose entity with:
- `_id`, `id` (inherited from Base)
- `name` (string, required) — human-readable name
- `slug` (string, required, unique, lowercase, kebab-case) — machine identifier
- `subject` (string, required) — email subject line with variable support
- `content` (string, required) — HTML body with variable placeholders
- `variables` (string[], default []) — list of variable names used in the template
- `imageUrl` (string, optional) — URL for a public image asset
- `isActive` (boolean, default true) — soft delete / toggle
- `version` (number, default 1) — auto-incremented on each update

### S2.2 — Create Template

**GIVEN** an authenticated admin
**WHEN** POST `/email/templates` with valid `CreateTemplateDto`
**THEN** a new template MUST be created and returned with `version: 1`
**AND** the `slug` MUST be validated as unique

**GIVEN** a request with a `slug` that already exists
**WHEN** POST `/email/templates`
**THEN** it MUST return a 409 Conflict

### S2.3 — Read Templates

**GIVEN** templates exist in the database
**WHEN** GET `/email/templates`
**THEN** it MUST return all templates (filter with `?active=true` for active only)

**GIVEN** a template exists with slug `password-reset`
**WHEN** GET `/email/templates/:slug`
**THEN** it MUST return that specific template

### S2.4 — Update Template

**GIVEN** a template exists with slug `welcome` and `version: 1`
**WHEN** PATCH `/email/templates/:slug` with updated content
**THEN** the template MUST be updated
**AND** `version` MUST increment to `2`
**AND** the response MUST include the new version number

### S2.5 — Delete Template

**GIVEN** a template exists with slug `old-template`
**WHEN** DELETE `/email/templates/:slug`
**THEN** the template MUST be removed from the database
**AND** the operation MUST return 204 No Content

### S2.6 — Default Templates Seeding

**GIVEN** the email module initializes
**WHEN** no templates exist in the database for a given default slug
**THEN** the default HTML template from `templates/defaults/` MUST be seeded
**AND** the seeded template MUST be marked with `isActive: true` and `version: 1`

**GIVEN** a seed script is run via `npm run seed:email-templates`
**WHEN** the script executes
**THEN** all default templates MUST be created if they don't already exist

**Default template slugs**:
- `welcome` — account verification email
- `password-reset` — password reset with link
- `email-change` — email change confirmation
- `password-changed` — password change notification

---

## S3. Email Sending Service

### S3.1 — Template Resolution

**GIVEN** an email send request with template slug `password-reset`
**WHEN** `EmailService.sendBySlug(slug, to, variables)` is called
**THEN** it MUST query the database for the template with that slug
**AND** if the template is found and `isActive`, it MUST be used
**AND** if the template is NOT found, it MUST fall back to the embedded default template
**AND** if the template exists but `isActive: false`, it MUST fall back to the embedded default

### S3.2 — Variable Substitution

**GIVEN** a template with content `"Hello {{userName}}, click {{resetLink}} to reset"`
**WHEN** `sendBySlug()` is called with variables `{ userName: "Leandro", resetLink: "https://..." }`
**THEN** the rendered HTML MUST be `"Hello Leandro, click https://... to reset"`

**GIVEN** a template references a variable that was NOT provided
**WHEN** `sendBySlug()` is called
**THEN** the placeholder MUST remain as-is in the output (e.g., `{{missingVar}}`)

**GIVEN** a subject line contains variables
**WHEN** `sendBySlug()` is called
**THEN** the subject MUST also have variables substituted

### S3.3 — Async Email Dispatch

**GIVEN** an email send request is received
**WHEN** `EmailService.sendBySlug()` is called
**THEN** it MUST dispatch the send asynchronously (non-blocking)
**AND** it MUST return immediately with `{ status: "queued" }`
**AND** the actual send MUST happen via EventEmitter (`@nestjs/event-emitter`)

### S3.4 — Email Logging

**GIVEN** an email send is attempted
**WHEN** the send completes (success or failure)
**THEN** an `EmailLog` entry MUST be updated with:
- `status` (sent|failed|pending)
- `messageId` (from provider, if successful)
- `error` (error message, if failed)

---

## S4. Email Controllers

### S4.1 — Email Controller (Admin Only)

**GIVEN** an authenticated admin
**WHEN** POST `/email/send` with `{ useCase: "password-reset", to: "user@test.com", variables: {...} }`
**THEN** the email MUST be sent using the appropriate template
**AND** the response MUST return `{ status: "queued" }`

**GIVEN** an authenticated admin
**WHEN** POST `/email/send-direct` with `{ to, subject, html }`
**THEN** the email MUST be sent with the provided content
**AND** the log entry MUST have `templateSlug: null`

**GIVEN** an unauthenticated request
**WHEN** POST `/email/send` or POST `/email/send-direct`
**THEN** it MUST return 401 Unauthorized

### S4.2 — Template Controller (Admin Only)

All CRUD operations on `/email/templates` MUST require admin role via `@Roles(UserRole.ADMIN)`.

### S4.3 — Swagger Documentation

All email endpoints MUST have complete Swagger documentation using the project's `applyDecorators` pattern:
- `ApiOperation`, `ApiExtraModels`, `ApiResponse`, `ApiBody`
- `ApiUnauthorizedResponse`, `ApiForbiddenResponse` for admin-guarded endpoints
- Request/response example models in `api-docs/examples/`

---

## S5. Email Audit Log

### S5.1 — Log Entity

**MUST** define an `EmailLog` Mongoose entity with:
- `_id`, `id` (inherited from Base)
- `recipient` (string, required)
- `templateSlug` (string, optional)
- `subject` (string, required)
- `provider` (string, required: resend|smtp)
- `status` (string, required: pending|sent|failed)
- `messageId` (string, optional)
- `error` (string, optional)
- `metadata` (object, optional)

### S5.2 — Repository Operations

**MUST** support creating, finding by recipient, paginated listing, and updating log entries.

---

## S6. Environment Configuration

### S6.1 — New Environment Variables

**MUST** add to `EnvironmentVariables`:
- `EMAIL_ENABLED` (optional, string)
- `EMAIL_PROVIDER` (optional, enum: smtp|resend)
- `EMAIL_HOST` (optional, string)
- `EMAIL_PORT` (optional, string)
- `EMAIL_SECURE` (optional, string)
- `EMAIL_USER` (optional, string)
- `EMAIL_PASS` (optional, string)
- `EMAIL_FROM` (optional, string)
- `RESEND_API_KEY` (optional, string)
- `RESEND_FROM_EMAIL` (optional, string)
- `RESEND_FROM_NAME` (optional, string)
- `FRONTEND_URL` (optional, string, valid URL format)
- `ACTIVATION_TOKEN_EXPIRATION_HOURS` (optional, string)
- `PASSWORD_RESET_TOKEN_EXPIRATION_HOURS` (optional, string)

### S6.2 — .env.example

**MUST** document all email env vars in `.env.example` with placeholder values.
**MUST NOT** include real credentials in `.env.example`.

### S6.3 — Git Safety

**MUST** add `.env.development` to `.gitignore` (remove the `!` exception).
**MUST** ensure only `.env.example` and `.env.production.example` are tracked.

---

## S7. Event-Driven Integration with Existing Flows

### S7.1 — Event-Driven Pattern (Architecture)

**MUST** use `EventEmitter2` (`@nestjs/event-emitter`) to decouple domain events from email sending.

**GIVEN** a business action occurs (registration, password reset, etc.)
**WHEN** the action completes successfully
**THEN** it MUST emit an event via `EventEmitter2.emit()`
**AND** `AuthService` MUST NOT directly call `EmailService`
**AND** `AuthService` MUST NOT import `EmailModule`

**GIVEN** an `EmailListener` is registered with `@OnEvent()`
**WHEN** the corresponding event is emitted
**THEN** it MUST handle the event and trigger the appropriate email

### S7.2 — Domain Events

**MUST** define event constants:

| Event Name | Payload | Triggered By | Email Template |
|-----------|---------|-------------|---------------|
| `user.registered` | `{ userId, email, name, verificationToken }` | `AuthService.register()` | `welcome` |
| `auth.forgot-password` | `{ userId, email, name, resetToken }` | `AuthService.forgotPassword()` | `password-reset` |
| `auth.password-changed` | `{ userId, email, name }` | `AuthService.resetPassword()` or profile change | `password-changed` |
| `user.email-change-requested` | `{ userId, newEmail, name, pendingEmailToken }` | `AuthService.changeEmail()` | `email-change` |
| `user.email-change-confirmed` | `{ userId, email, name }` | `AuthService.confirmEmailChange()` | `password-changed` |
| `auth.resend-verification` | `{ userId, email, name, verificationToken }` | `AuthService.resendVerification()` | `welcome` |

### S7.3 — Forgot Password Integration

**GIVEN** a user exists in the database
**WHEN** POST `/auth/forgot-password` with their email
**THEN** a reset token MUST be generated and stored
**AND** the `auth.forgot-password` event MUST be emitted
**AND** the response MUST NOT reveal whether the email exists (security)

**GIVEN** the `auth.forgot-password` event is received
**WHEN** `EmailListener` handles the event
**THEN** the `password-reset` template MUST be triggered with the reset link

### S7.4 — Registration Verification

**GIVEN** a new user registers
**WHEN** `AuthService.register()` creates the user with `isActive: false`
**THEN** an `emailVerificationToken` MUST be generated and stored
**AND** the `user.registered` event MUST be emitted

**GIVEN** the `user.registered` event is received
**WHEN** `EmailListener` handles the event
**THEN** the `welcome` template MUST be triggered with the verification link

### S7.5 — Email Verification

**GIVEN** a user has a valid `emailVerificationToken`
**WHEN** POST `/auth/verify-email` with `{ token }`
**THEN** the user MUST be activated (`isActive: true`)
**AND** the token MUST be cleared

### S7.6 — Email Change Flow

**GIVEN** an authenticated user requests to change their email
**WHEN** POST `/users/change-email` with `{ email: "new@test.com" }`
**THEN** a `pendingEmail`, `pendingEmailToken`, and `pendingEmailExpires` MUST be stored
**AND** the `user.email-change-requested` event MUST be emitted
**AND** the email MUST NOT be updated until confirmed

### S7.7 — Confirm Email Change

**GIVEN** a user has a valid `pendingEmailToken`
**WHEN** POST `/auth/confirm-email-change` with `{ token }`
**THEN** the user's email MUST be updated to the pending email
**AND** the `user.email-change-confirmed` event MUST be emitted

### S7.8 — Password Changed Notification

**GIVEN** an authenticated user changes their password
**WHEN** POST `/users/change-password` succeeds
**THEN** the `auth.password-changed` event MUST be emitted

### S7.9 — Resend Verification Email

**GIVEN** a user needs to re-request email verification
**WHEN** POST `/auth/resend-verification` with `{ email }`
**THEN** a new verification token MUST be generated
**AND** the `auth.resend-verification` event MUST be emitted
**AND** the response MUST NOT reveal whether the email exists (security)

### S7.10 — User Entity Extensions

**MUST** add to `User` entity:
- `emailVerificationToken` (string, optional)
- `emailVerificationExpires` (Date, optional)
- `pendingEmail` (string, optional)
- `pendingEmailToken` (string, optional)
- `pendingEmailExpires` (Date, optional)

### S7.11 — Avoid Circular Dependencies
**MUST** ensure `AuthModule` does NOT import `EmailModule`.
**AND** `AuthService` MUST NOT inject `EmailService`.
**MUST** use event-driven pattern (S7.1) to decouple.

### S7.12 — EmailListener Error Handling
**GIVEN** an `EmailListener` event handler fails (e.g., template not found).
**WHEN** the event is emitted.
**THEN** the original operation (e.g., registration) MUST NOT fail.
**AND** the error MUST be logged but NOT re-thrown.

---

## S8. Password Hashing on Reset

### S8.1 — Hash Password in Reset
**GIVEN** a valid reset token is used.
**WHEN** `AuthService.resetPassword(token, newPassword)` is called.
**THEN** `newPassword` MUST be hashed before storing.
**AND** `UserRepository.update()` MUST use `.save()` to trigger pre-save hooks for hashing.

### S8.2 — AuthResponse Update
**MUST** update `AuthResponse` interface to include:
- `user.id` (string)
- `user.userName` (string)
- `verificationToken` (optional string, present when `isActive: false`)

**GIVEN** a new user registers.
**WHEN** `AuthService.register()` completes.
**THEN** the response MUST include `verificationToken` for e2e test flows.

---

## S9. Error Handling

### S8.1 — Provider Failure

**GIVEN** the email provider returns an error
**WHEN** an email send is attempted
**THEN** the log entry MUST record `status: "failed"` with the error message
**AND** the service MUST NOT throw (async dispatch — log the failure)

### S8.2 — Template Not Found

**GIVEN** a send request references a non-existent slug
**WHEN** no default template exists for that slug
**THEN** the log entry MUST record `status: "failed"` with "template not found"
**AND** the service MUST throw a NotFoundException

---

## S9. Seed Scripts

### S9.1 — Email Template Seed

**MUST** create `src/database/seeds/seed-email-templates.ts` following the existing seed pattern.
**MUST** add `npm run seed:email-templates` script to `package.json`.
**MUST** include `seed:email-templates` in `npm run seed:all`.
