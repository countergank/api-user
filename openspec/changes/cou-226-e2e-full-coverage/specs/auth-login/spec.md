# Delta for auth-login

## ADDED Requirements

### Requirement: Reset password flow

The system MUST support a password reset flow: request reset token via email, then submit new password with token.

#### Scenario: Request password reset

- GIVEN a user exists with email "user@test.com"
- WHEN POST /auth/reset-password with { email: "user@test.com" }
- THEN returns HTTP 200 (always, even if email not found — prevents enumeration)
- AND a reset token is generated and associated with the user

#### Scenario: Reset password with valid token

- GIVEN a valid reset token exists for a user
- WHEN POST /auth/reset-password/confirm with { token, newPassword }
- THEN returns HTTP 200 with success
- AND the user's password is updated (hashed)
- AND the reset token is invalidated

#### Scenario: Reset password with expired/invalid token

- GIVEN an expired or invalid reset token
- WHEN POST /auth/reset-password/confirm with { token, newPassword }
- THEN returns HTTP 400 with invalid-token error

### Requirement: Confirm email change

The system MUST support email change confirmation via token.

#### Scenario: Confirm email change with valid token

- GIVEN a user initiated email change and received a confirmation token
- WHEN POST /auth/confirm-email-change with { token }
- THEN returns HTTP 201 with success
- AND the user's email is updated to the new value
- AND pendingEmail, pendingEmailToken, and pendingEmailExpires are cleared from the user document

#### Scenario: Confirm email change with already-consumed token

- GIVEN an email change token was already used successfully
- WHEN POST /auth/confirm-email-change with the same token again
- THEN returns HTTP 400 with expired/invalid token error (code UA-AUTH-007)
- AND the token cannot be reused because it was cleared from the database

#### Scenario: Confirm email change with invalid token

- GIVEN an expired or invalid email change token
- WHEN POST /auth/confirm-email-change with { token }
- THEN returns HTTP 400 with invalid-token error

### Requirement: Resend verification email

The system MUST allow resending the account verification email.

#### Scenario: Resend verification email

- GIVEN an unverified user account exists
- WHEN POST /auth/resend-verification with { email }
- THEN returns HTTP 200
- AND a new verification email is triggered (or queued if EMAIL_ENABLED=false)

#### Scenario: Resend verification for already verified user

- GIVEN a user account is already verified
- WHEN POST /auth/resend-verification with { email }
- THEN returns HTTP 400 with already-verified error
