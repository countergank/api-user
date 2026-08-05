# Proposal: COU-214 Fix Change Password 500 Error

## Intent

Fix critical bug (P1) where `POST /users/change-password` returns HTTP 500 "Illegal arguments: string, undefined" from `bcrypt.compareSync`. Root cause: controller compares `dto.currentPassword` against `user.password` where `user` comes from `@CurrentUser()` → JWT strategy → `authService.validateUser` → `userService.findById` **without** `{includePassword:true}`. The `password` field has `@Prop({select:false})`, so `user.password` is `undefined` → `bcrypt.compareSync(string, undefined)` throws. Additionally, the controller updates with plaintext password, bypassing hashing (latent security issue).

## Scope

### In Scope
- Add `changePassword(userId, currentPassword, newPassword)` method to `UserService`
- Refactor `UserProfileController.changePassword` to delegate to `UserService.changePassword`
- Hash new password before persistence (follow `resetPassword` pattern)
- Unit tests: `user.service.spec.ts` (includePassword fetch, wrong password throw, hash before update)
- Unit tests: `user-profile.controller.spec.ts` (mock service, happy path + `CURRENT_PASSWORD_INCORRECT`)
- E2E test: `test/user-profile.e2e-spec.ts` as regression (200 valid, 400 incorrect)

### Out of Scope
- Modify `authService.validateUser` or JWT strategy (would leak hash to Redis cache)
- Change `UserRepository.update` (no pre-save hook; hashing stays in service layer)
- Add `includePassword:true` to any cached user lookup
- Password policy/validation changes (separate capability: `password-validation`)

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `user-profile`: change-password flow now validates current password via service, hashes new password before update, returns proper 400 on wrong password

## Approach

Follow the `auth.service.login` pattern: transient re-fetch with `includePassword:true` in service layer (no cache), validate via `validatePassword`, hash via `hashPassword`, then update. Controller becomes thin delegation. This avoids leaking password hash to Redis cache (key `user:{id}`, TTL 5min) used by `authService.validateUser`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/user/service/user.service.ts` | Modified | Add `changePassword` method with transient `findById(userId, {includePassword:true})` |
| `src/user/controller/user-profile.controller.ts` | Modified | Delegate to `service.changePassword`; remove direct bcrypt compare and raw update |
| `src/user/service/user.service.spec.ts` | Modified | Add coverage for changePassword (includePassword, wrong password, hash) |
| `src/user/controller/user-profile.controller.spec.ts` | Modified | Rewrite to mock `service.changePassword`; test happy + error paths |
| `test/user-profile.e2e-spec.ts` | Modified | Regression: 200 valid change, 400 incorrect current password |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Redis cache pollution if `includePassword:true` added to `validateUser` | High | **Explicitly avoided** — service does transient fetch only |
| Plaintext password persisted if hashing missed | Medium | Unit test asserts `update` called with hashed value; follows `resetPassword` pattern |
| Regression in `@CurrentUser()` user object for other endpoints | Low | No changes to JWT strategy or `validateUser`; only change-password flow uses new service method |

## Rollback Plan

Revert `user-profile.controller.ts` and `user.service.ts` to pre-change state. No database migration needed (passwords already hashed by `resetPassword`/`login` flows). Run `npm test` to confirm green.

## Dependencies

- Existing `UserService.validatePassword` and `hashPassword` methods (used by `auth.service.login` and `resetPassword`)
- Existing `DomainError.CURRENT_PASSWORD_INCORRECT` and `USER_NOT_FOUND` mappings

## Success Criteria

- [ ] `POST /users/change-password` returns 200 on valid current password
- [ ] Returns 400 `CURRENT_PASSWORD_INCORRECT` on wrong current password
- [ ] Returns 404 `USER_NOT_FOUND` if user deleted between token issuance and request
- [ ] New password stored as bcrypt hash (verified via `user.repository.spec.ts` or direct DB check)
- [ ] All unit + e2e tests pass (`npm test`)
- [ ] No 500 errors in change-password flow