# Tasks: COU-214 Fix Change Password 500 Error

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 75-150 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | single PR |
| Delivery strategy | auto-chain |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: feature-branch-chain
size-exception: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | T0: Write RED tests for UserService.changePassword behavior | PR 1 | npm test -- src/user/service/user.service.spec.ts | N/A (unit tests only) | service/user.service.ts (rollback removes new method) |
| 2 | T1: Write RED tests for UserProfileController.changePassword behavior | PR 1 | npm test -- src/user/controller/user-profile.controller.spec.ts | N/A (unit tests only) | controller/user-profile.controller.ts (rollback removes EncodeService removal) |
| 3 | T2: Implement UserService.changePassword with transient password fetch | PR 1 | npm test -- src/user/service/user.service.spec.ts | Request POST /users/change-password with valid credentials | service/user.service.ts, rollback removes new method |
| 4 | T3: Refactor UserProfileController to delegate to service | PR 1 | npm test -- src/user/controller/user-profile.controller.spec.ts | Request POST /users/change-password with valid credentials | controller/user-profile.controller.ts, rollback restores EncodeService injection |
| 5 | T4: Run existing e2e regression tests | PR 1 | npm run test:e2e -- test/user-profile.e2e-spec.ts | Full HTTP flow via existing test runner | test/user-profile.e2e-spec.ts, rollback reverts test modifications |
| 6 | T5: Run complete npm test suite | PR 1 | npm test | Full application test suite | All modified files, rollback to pre-change state |

## Phase 1: Foundation / Tests

- [x] 1.1 Write RED test for UserService.changePassword - wrong password throws CURRENT_PASSWORD_INCORRECT, no update called
- [x] 1.2 Write RED test for UserService.changePassword - valid password calls update with hashed value
- [x] 1.3 Write RED test for UserService.changePassword - includePassword:true transient fetch
- [x] 1.4 Write RED test for UserProfileController.changePassword - happy path: calls service, emits event, returns message
- [x] 1.5 Write RED test for UserProfileController.changePassword - wrong password propagates CURRENT_PASSWORD_INCORRECT error
- [x] 1.6 Remove hardcoded password bug-mascara from UserProfileController test

## Phase 2: Core Implementation

- [x] 2.1 Implement UserService.changePassword(userId, currentPassword, newPassword)
- [x] 2.2 Verify transient fetch with {includePassword: true}
- [x] 2.3 Verify password validation using validatePassword
- [x] 2.4 Verify new password hashing using hashPassword
- [x] 2.5 Verify update call with hashed password (never plaintext)

## Phase 3: Integration / Controller Delegation

- [x] 3.1 Refactor UserProfileController.changePassword to delegate to UserService.changePassword
- [x] 3.2 Remove EncodeService injection from controller constructor
- [x] 3.3 Remove direct bcrypt comparison from controller
- [x] 3.4 Remove raw update call from controller
- [x] 3.5 Ensure event emission still works via service layer

## Phase 4: Testing / Verification

- [x] 4.1 Run existing e2e regression tests (200 valid + 400 incorrect)
- [x] 4.2 Run complete unit test suite
- [x] 4.3 Verify all existing functionality still works
- [x] 4.4 Confirm no 500 errors in change-password flow
- [x] 4.5 Verify password hashing (not plaintext) in tests
- [x] 4.6 Ensure transient password fetch doesn't leak to cache