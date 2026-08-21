# Delta for user-profile

## ADDED Requirements

### Requirement: Change email

The system MUST support email change via POST /users/change-email. The user must authenticate with their current password, and the new email must be confirmed via token.

#### Scenario: Initiate email change

- GIVEN an authenticated user with email "old@test.com"
- WHEN POST /users/change-email with { newEmail: "new@test.com", currentPassword: "Secret123!" }
- THEN returns HTTP 200 with success
- AND a confirmation token is sent to the new email
- AND the email is NOT changed until confirmation

#### Scenario: Change email with wrong current password

- GIVEN an authenticated user
- WHEN POST /users/change-email with { newEmail: "new@test.com", currentPassword: "wrong" }
- THEN returns HTTP 400 with CURRENT_PASSWORD_INCORRECT error

#### Scenario: Change email to duplicate email

- GIVEN another user already has email "existing@test.com"
- WHEN authenticated user sends POST /users/change-email with { newEmail: "existing@test.com", currentPassword: "Secret123!" }
- THEN returns HTTP 409 with duplicate-email error

#### Scenario: Change email without authentication

- WHEN POST /users/change-email is called without Authorization header
- THEN returns HTTP 401 Unauthorized
