# Archive Report — cou-214-fix-change-password-500

| Field | Value |
|-------|-------|
| Change | cou-214-fix-change-password-500 |
| Branch | fix/cou-214-change-password-500 |
| Date | 2026-08-05 |
| Mode | Openspec (with Engram backup) |
| Verdict | PASS |

## Summary

Fixed the critical change-password 500 error by implementing secure password validation and hashing. The system now validates current passwords without exposing the hash to the controller layer, hashes new passwords before persistence, and properly delegates operations to the service layer. This eliminates the root cause where direct bcrypt comparison caused 500 errors due to undefined password hash from @CurrentUser().

## Metrics

| Metric | Value |
|--------|-------|
| Spec requirements | 8/8 (CHANGEPASS-01 to CHANGEPASS-08) |
| Scenarios | 14/14 (CHANGEPASS-S01 to CHANGEPASS-S14) |
| Implementation tasks | 22/22 (4 phases) |
| Tests | 717 passed, 0 failures (67 suites) |
| TypeScript errors | 0 |
| Files modified | 12 |
| Files created | 2 (controller, service tests) |
| Commits | 2 (feat + refactor) |

## Phase Summaries

### Phase 1: Foundation / Tests

**Engram ID**: #1075

- Wrote RED tests for UserService.changePassword behavior covering wrong password rejection, valid password calls, and transient includePassword:true fetch.
- Created controller tests covering happy path, error propagation, and event emission.
- Removed hardcoded password bug-mascara from controller tests.

### Phase 2: Core Implementation

**Engram ID**: #1076

- Implemented UserService.changePassword(userId, currentPassword, newPassword) with transient password fetch.
- Verified password validation using validatePassword and new password hashing using hashPassword.
- Ensured update call receives hashed password (never plaintext).
- Applied existing auth patterns and reusable service methods.

### Phase 3: Integration / Controller Delegation

**Engram ID**: #1077

- Refactored UserProfileController.changePassword to delegate to UserService.changePassword.
- Removed EncodeService injection from controller constructor.
- Eliminated direct bcrypt comparison and raw update operations from controller.
- Preserved PASSWORD_CHANGED event emission via service layer.

### Phase 4: Testing / Verification

**Engram ID**: #1078

- Ran existing e2e regression tests (200 valid + 400 incorrect) with 5/5 passing.
- Executed complete unit test suite: 717 tests passing across 67 suites.
- Verified all existing functionality still works post-change.
- Confirmed no 500 errors in change-password flow.
- Validated password hashing (not plaintext) in tests.
- Ensured transient password fetch doesn't leak to Redis cache.

## Archive Contents

- proposal.md ✅
- specs/user-profile/spec.md ✅
- design.md ✅
- tasks.md ✅ (22/22 tasks complete)
- verify-report.md ✅

## Engram Artifact References

| Phase | Observation ID | Topic |
|-------|---------------|-------|
| Proposal | #1075 | sdd/cou-214-fix-change-password-500/proposal |
| Spec | #1076 | sdd/cou-214-fix-change-password-500/spec |
| Design | #1077 | sdd/cou-214-fix-change-password-500/design |
| Tasks | #1078 | sdd/cou-214-fix-change-password-500/tasks |
| Apply | #1079 | sdd/cou-214-fix-change-password-500/apply-progress |
| Verify | #1080 | sdd/cou-214-fix-change-password-500/verify-report |
| Archive | (this report) | sdd/cou-214-fix-change-password-500/archive-report |

## Specs Synced

| Domain | Action | Details |
|--------|--------|---------|
| user-profile | Created (new domain) | 8 requirements, 14 scenarios from delta spec |

## Source of Truth Updated

- `openspec/specs/user-profile/spec.md` — now contains the full user-profile specification with change-password requirements and scenarios
- `openspec/changes/archive/2026-08-05-cou-214-fix-change-password-500/` — all artifacts archived

## SDD Cycle Complete

The change has been fully planned, implemented, verified, and archived.
Ready for the next change.
