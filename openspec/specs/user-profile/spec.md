# user-profile Specification

> Migrated from `openspec/SPEC.md` (deleted 2026-07-06).
> Updated from delta `cou-214-fix-change-password-500` — change-password 500 error fix.
> Updated by cou-226-e2e-full-coverage — added change-email.

## Overview

User profile management and password change.

### Requirements

#### Requirement: change-password validates current password without exposing hash

The system MUST validate the provided current password against the stored hash without exposing the hash to the controller layer.

##### Scenario: Valid current password

- GIVEN a user exists with a hashed password
- WHEN POST /users/change-password with correct current password
- THEN returns HTTP 200 with success message
- AND new password is hashed before storing

##### Scenario: Incorrect current password

- GIVEN a user exists with a hashed password
- WHEN POST /users/change-password with incorrect current password
- THEN returns HTTP 400 with CURRENT_PASSWORD_INCORRECT error
- AND password is not changed

##### Scenario: User not found between token and request

- GIVEN authentication token for non-existent user
- WHEN POST /users/change-password
- THEN returns HTTP 404 with USER_NOT_FOUND error

#### Requirement: change-password hashens new password before persisting

The system MUST hash the new password using bcrypt before persisting to the database.

##### Scenario: New password hashed before update

- GIVEN valid current password and new password
- WHEN changePassword service is called
- THEN hashes new password with bcrypt
- AND calls update with hashed password (never plaintext)

##### Scenario: Password follows resetPassword pattern

- GIVEN existing resetPassword behavior
- WHEN new password flow uses same hashing logic
- THEN consistency maintained across password operations

#### Requirement: controller delegates to service layer

The system MUST delegate password change operations to UserService.changePassword, removing direct bcrypt operations and raw updates from controller.

##### Scenario: Controller delegates to service

- GIVEN changePassword request DTO
- WHEN POST /users/change-password reaches controller
- THEN delegates to UserService.changePassword
- AND no direct bcrypt or update operations in controller

##### Scenario: Service includes transient password fetch

- GIVEN user ID and passwords
- WHEN UserService.changePassword is called
- THEN fetches user with includePassword:true (transient)
- AND uses validatePassword and hashPassword from service

#### Requirement: change-password validation

The system MUST validate current password without exposing hash, ensuring proper authentication and password security.

##### Scenario: Valid current password

- GIVEN a user exists with a hashed password
- WHEN POST /users/change-password with correct current password
- THEN returns HTTP 200 with success message
- AND new password is hashed before storing

##### Scenario: Incorrect current password

- GIVEN a user exists with a hashed password
- WHEN POST /users/change-password with incorrect current password
- THEN returns HTTP 400 with CURRENT_PASSWORD_INCORRECT error
- AND password is not changed

##### Scenario: User not found between token and request

- GIVEN authentication token for non-existent user
- WHEN POST /users/change-password
- THEN returns HTTP 404 with USER_NOT_FOUND error

#### Requirement: Change email

The system MUST support email change via POST /users/change-email. The user must authenticate with their current password, and the new email must be confirmed via token.

##### Scenario: Initiate email change

- GIVEN an authenticated user with email "old@test.com"
- WHEN POST /users/change-email with { newEmail: "new@test.com", currentPassword: "Secret123!" }
- THEN returns HTTP 200 with success
- AND a confirmation token is sent to the new email
- AND the email is NOT changed until confirmation

##### Scenario: Change email with wrong current password

- GIVEN an authenticated user
- WHEN POST /users/change-email with { newEmail: "new@test.com", currentPassword: "wrong" }
- THEN returns HTTP 400 with CURRENT_PASSWORD_INCORRECT error

##### Scenario: Change email to duplicate email

- GIVEN another user already has email "existing@test.com"
- WHEN authenticated user sends POST /users/change-email with { newEmail: "existing@test.com", currentPassword: "Secret123!" }
- THEN returns HTTP 409 with duplicate-email error

##### Scenario: Change email without authentication

- WHEN POST /users/change-email is called without Authorization header
- THEN returns HTTP 401 Unauthorized

