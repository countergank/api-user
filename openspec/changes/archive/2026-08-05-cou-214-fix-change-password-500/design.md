# Design: COU-214 Fix Change Password 500 Error

## Technical Approach

Follow the `auth.service.login` pattern: transient re-fetch with `includePassword:true` in service layer (no cache), validate via `validatePassword`, hash via `hashPassword`, then update. Controller becomes thin delegation to `UserService.changePassword`. This avoids leaking password hash to Redis cache (key `user:{id}`, TTL 5min) used by `authService.validateUser`.

## Architecture Decisions

### Decision: Service-layer password validation (not controller)

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Keep validation in controller | Simpler, but leaks `EncodeService` into controller; bypasses service-layer audit/hash | **Rejected** |
| Add `includePassword:true` to `authService.validateUser` | Fixes 500, but caches password hash in Redis (security leak) | **Rejected** |
| New `UserService.changePassword` with transient `findById(includePassword:true)` | Mirrors `login` pattern; no cache leak; single source of truth for hashing | **Chosen** |

**Rationale**: The `login` method already uses this exact pattern (`findByEmail(email, { includePassword: true })`). Reusing it keeps hashing logic centralized in `UserService`, adds audit trail via existing `@AuditAction`, and avoids Redis cache pollution.

### Decision: Controller delegates entirely to service

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Controller keeps `EncodeService` injection | Works but duplicates validation logic | **Rejected** |
| Controller calls `service.changePassword(user.id, dto.currentPassword, dto.newPassword)` | Thin controller; single responsibility; easier testing | **Chosen** |

**Rationale**: Removes `EncodeService` from controller constructor. Controller only handles HTTP concerns (DTO validation, response mapping). All business logic lives in service.

### Decision: No changes to `UserRepository.update` or pre-save hooks

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Add pre-save hook to hash password | Transparent but implicit; breaks `resetPassword` which pre-hashes | **Rejected** |
| Hash in service before `update` (current `resetPassword` pattern) | Explicit; testable; consistent with existing codebase | **Chosen** |

**Rationale**: `resetPassword` in `auth.service.ts:196` already hashes via `userService.hashPassword` before calling `update`. Following this pattern avoids double-hashing and keeps hashing intent visible in service layer.

## Data Flow

```
POST /users/change-password
       │
       ▼
UserProfileController.changePassword(dto, userFromJWT)
       │
       ▼
UserService.changePassword(userId, currentPassword, newPassword)
       │
       ├─► findById(userId, { includePassword: true })  ──► User (with password)
       │
       ├─► validatePassword(currentPassword, user.password) ──► boolean
       │       │
       │       └─► if false: throw DomainError(CURRENT_PASSWORD_INCORRECT)
       │
       ├─► hashPassword(newPassword) ──► hashedPassword
       │
       └─► update(userId, { password: hashedPassword }) ──► User (updated)
       │
       ▼
EventEmitter.emit(PASSWORD_CHANGED)
       │
       ▼
HTTP 200 { message: "Password changed" }
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/user/service/user.service.ts` | Modify | Add `changePassword(userId, currentPassword, newPassword)` method |
| `src/user/controller/user-profile.controller.ts` | Modify | Delegate to `service.changePassword`; remove `EncodeService` injection and raw `update` call |
| `src/user/service/user.service.spec.ts` | Modify | Add tests for `changePassword`: includePassword fetch, wrong password throw, hash before update |
| `src/user/controller/user-profile.controller.spec.ts` | Modify | Rewrite to mock `service.changePassword`; test happy path + `CURRENT_PASSWORD_INCORRECT` |
| `test/user-profile.e2e-spec.ts` | Modify | Regression tests: 200 valid change, 400 incorrect current password |

## Interfaces / Contracts

```typescript
// src/user/service/user.service.ts (new method)
async changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = await this.findById(userId, { includePassword: true });
  if (!(await this.validatePassword(currentPassword, user.password))) {
    throw DomainError.fromKind('CURRENT_PASSWORD_INCORRECT');
  }
  const hashed = await this.hashPassword(newPassword);
  await this.update(userId, { password: hashed });
}
```

```typescript
// src/user/controller/user-profile.controller.ts (modified)
async changePassword(
  @CurrentUser() user: User,
  @Body() dto: ChangePasswordDTO,
  @RequestLang() lang: string | undefined,
) {
  await this.userService.changePassword(user.id, dto.currentPassword, dto.newPassword);
  this.eventEmitter.emit(EmailEvents.PASSWORD_CHANGED, { ... });
  return { message: await this.t('messages.password_changed', lang) };
}
```

Controller constructor: **remove** `private encodeService: EncodeService`.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit (service) | `findById` called with `{ includePassword: true }` | Mock `userRepository.findById`; assert call with opts |
| Unit (service) | Wrong current password → throws `CURRENT_PASSWORD_INCORRECT`, **no** `update` called | Mock `validatePassword` → `false`; expect throw; `update` not called |
| Unit (service) | Valid password → `update` called with **hashed** value, not plaintext | Mock `hashPassword` → `'hashed-value'`; assert `update(userId, { password: 'hashed-value' })` |
| Unit (controller) | Happy path: calls `service.changePassword`, emits event, returns message | Mock `service.changePassword` → resolves; assert emit + response |
| Unit (controller) | Service throws `CURRENT_PASSWORD_INCORRECT` → propagates as 400 | Mock `service.changePassword` → rejects; expect throw |
| E2E | Valid current password → 200, password actually changed (login with new works) | Full HTTP flow via `supertest` |
| E2E | Invalid current password → 400 `CURRENT_PASSWORD_INCORRECT` | Full HTTP flow; assert error code |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration required. Existing passwords already hashed by `resetPassword`/`login` flows. Rollback: revert `user-profile.controller.ts` and `user.service.ts` to pre-change state. Run `npm test` to confirm green.

## Open Questions

- [ ] None — all decisions resolved in proposal.