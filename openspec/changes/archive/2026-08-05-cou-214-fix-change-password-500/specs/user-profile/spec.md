# Delta for user-profile

## ADDED Requirements

### Requirement: change-password validates current password without exposing hash

The system MUST validate the provided current password against the stored hash without exposing the hash to the controller layer.

#### Scenario: Valid current password

- GIVEN a user exists with a hashed password
- WHEN POST /users/change-password with correct current password
- THEN returns HTTP 200 with success message
- AND new password is hashed before storing

#### Scenario: Incorrect current password

- GIVEN a user exists with a hashed password
- WHEN POST /users/change-password with incorrect current password
- THEN returns HTTP 400 with CURRENT_PASSWORD_INCORRECT error
- AND password is not changed

#### Scenario: User not found between token and request

- GIVEN authentication token for non-existent user
- WHEN POST /users/change-password
- THEN returns HTTP 404 with USER_NOT_FOUND error

### Requirement: change-password hashens new password before persisting

The system MUST hash the new password using bcrypt before persisting to the database.

#### Scenario: New password hashed before update

- GIVEN valid current password and new password
- WHEN changePassword service is called
- THEN hashes new password with bcrypt
- AND calls update with hashed password (never plaintext)

#### Scenario: Password follows resetPassword pattern

- GIVEN existing resetPassword behavior
- WHEN new password flow uses same hashing logic
- THEN consistency maintained across password operations

### Requirement: controller delegates to service layer

The system MUST delegate password change operations to UserService.changePassword, removing direct bcrypt operations and raw updates from controller.

#### Scenario: Controller delegates to service

- GIVEN changePassword request DTO
- WHEN POST /users/change-password reaches controller
- THEN delegates to UserService.changePassword
- AND no direct bcrypt or update operations in controller

#### Scenario: Service includes transient password fetch

- GIVEN user ID and passwords
- WHEN UserService.changePassword is called
- THEN fetches user with includePassword:true (transient)
- AND uses validatePassword and hashPassword from service

## MODIFIED Requirements

### Requirement: change-password validates current password without exposing hash

The system MUST validate the provided current password against the stored hash without exposing the hash to the controller layer.
(Previously: Current password validation using @CurrentUser() user object with undefined password hash causing 500 error)

#### Scenario: Valid current password

- GIVEN a user exists with a hashed password
- WHEN POST /users/change-password with correct current password
- THEN returns HTTP 200 with success message
- AND new password is hashed before storing

#### Scenario: Incorrect current password

- GIVEN a user exists with a hashed password
- WHEN POST /users/change-password with incorrect current password
- THEN returns HTTP 400 with CURRENT_PASSWORD_INCORRECT error
- AND password is not changed

#### Scenario: User not found between token and request

- GIVEN authentication token for non-existent user
- WHEN POST /users/change-password
- THEN returns HTTP 404 with USER_NOT_FOUND error

### Requirement: change-password hashens new password before persisting

The system MUST hash the new password using bcrypt before persisting to the database.
(Previously: New password persisted as plaintext bypassing hashing mechanism)

#### Scenario: New password hashed before update

- GIVEN valid current password and new password
- WHEN changePassword service is called
- THEN hashes new password with bcrypt
- AND calls update with hashed password (never plaintext)

#### Scenario: Password follows resetPassword pattern

- GIVEN existing resetPassword behavior
- WHEN new password flow uses same hashing logic
- THEN consistency maintained across password operations

### Requirement: controller delegates to service layer

The system MUST delegate password change operations to UserService.changePassword, removing direct bcrypt operations and raw updates from controller.
(Previously: Controller performed direct bcrypt.compare and raw update operations)

#### Scenario: Controller delegates to service

- GIVEN changePassword request DTO
- WHEN POST /users/change-password reaches controller
- THEN delegates to UserService.changePassword
- AND no direct bcrypt or update operations in controller

#### Scenario: Service includes transient password fetch

- GIVEN user ID and passwords
- WHEN UserService.changePassword is called
- THEN fetches user with includePassword:true (transient)
- AND uses validatePassword and hashPassword from service

## REMOVED Requirements

### Requirement: controller performs direct bcrypt comparison

(Reason: Direct bcrypt comparison caused 500 error due to undefined password hash from @CurrentUser())
(Migration: Removed - validation moved to UserService.changePassword with transient includePassword:true fetch)

## RENAMED Requirements

### Requirement: change-password error handling → change-password validation

(Reason: Error handling approach replaced with proper validation in service layer)
(Migration: Updated error messages to use DomainError.CURRENT_PASSWORD_INCORRECT and USER_NOT_FOUND)

## Summary

This delta specification for the user-profile capability addresses the critical bug in the change-password flow by:

1. **Added Requirements**:
   - Secure current password validation without hash exposure
   - Mandatory new password hashing before persistence
   - Clean controller-to-service delegation architecture

2. **Modified Requirements**:
   - Updated password validation to use transient service fetch
   - Fixed new password storage with proper bcrypt hashing
   - Restructured controller to delegate to service layer

3. **Removed Requirements**:
   - Eliminated direct bcrypt comparison in controller (root cause of 500 error)

4. **Renamed Requirements**:
   - Shifted focus from error handling to systematic validation

Key improvements include eliminating Redis cache pollution risks, ensuring password security through proper hashing, and implementing a robust error handling mechanism that prevents undefined hash scenarios.
