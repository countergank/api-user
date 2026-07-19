# Tasks: Controller Decorators + Docker Hardening

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~250-300 (2 new decorators + 2 test files + 7 controller refactors + entity + Dockerfile) |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | auto-forecast |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Decorators + controller refactoring + entity + Docker | PR 1 | Single work unit; mechanical replacements keep diff focused |

## Phase 1: Foundation — Create Decorators (TDD)

- [x] 1.1 **RED** — Create `src/common/decorators/current-user.decorator.spec.ts`: test `@CurrentUser()` extracts `request.user` (User entity) and returns `undefined` when no guard attached. Use `createParamDecorator` mock.
- [x] 1.2 **GREEN** — Create `src/common/decorators/current-user.decorator.ts`: implement `@CurrentUser()` via `createParamDecorator((data, ctx) => ctx.switchToHttp().getRequest().user)`.
- [x] 1.3 **RED** — Create `src/common/decorators/request-lang.decorator.spec.ts`: test `@RequestLang()` returns 2-char code for supported langs (`es`, `en`, `pt`), `undefined` for unsupported/missing header.
- [x] 1.4 **GREEN** — Create `src/common/decorators/request-lang.decorator.ts`: implement `@RequestLang()` via `createParamDecorator` delegating to existing `getRequestLang()`.
- [x] 1.5 **VERIFY** — Run `npm test -- --testPathPattern=decorators` — both decorator specs pass.

## Phase 2: WS-4 Controller Refactoring (TDD)

- [x] 2.1 **Refactor user-profile.controller.ts** — Replace `@Request() req` + `req.user` with `@CurrentUser() user: User` in 4 handlers (getProfile, updateProfile, changePassword, changeEmail). Replace `getRequestLang(req)` with `@RequestLang() lang`. Remove `getRequestLang` import. Update private `t(key, req)` → `t(key, lang)`.
- [x] 2.2 **Refactor auth.controller.ts** — Replace `@Req() req` with `@RequestLang() lang` in 6 handlers (register, forgotPassword, resetPassword, verifyEmail, confirmEmailChange, resendVerification). Replace all `getRequestLang(req)` calls with `lang`. Update private `t(key, req)` → `t(key, lang)`. Remove `@Req` and `getRequestLang` imports.
- [x] 2.3 **Refactor user.controller.ts** — Replace `@Req() req` with `@RequestLang() lang` in 2 handlers (unlock, delete). Update private `t(key, req)` → `t(key, lang)`. Remove `@Req` and `getRequestLang` imports.
- [x] 2.4 **Fix route ordering in user.controller.ts** — Move `@Get()` findAll (line 113-130) BEFORE `@Get(':id')` findById (line 94-111). Verify `GET /admin/users` no longer matches `:id` param.
- [x] 2.5 **Refactor audit.controller.ts** — Replace `@Req() _req` with `@RequestLang() lang`. Update `t(key, req)` → `t(key, lang)`.
- [x] 2.6 **Refactor i18n-admin.controller.ts** — Replace `@Req() req` with `@RequestLang() lang`. Replace `getRequestLang(req)` with `lang`.
- [x] 2.7 **Refactor role.controller.ts** — Replace `@Req() req` with `@RequestLang() lang` in 2 handlers (findAll, updatePermissions). Replace `getRequestLang(req)` with `lang`.
- [x] 2.8 **Refactor permission.controller.ts** — Replace `@Req() req` with `@RequestLang() lang`. Replace `getRequestLang(req)` with `lang`.
- [x] 2.9 **Add @Exclude() to User.password** — In `src/user/entities/user.entity.ts`, add `import { Exclude } from 'class-transformer'` and `@Exclude()` decorator on the `password` property (line 30-31).
- [x] 2.10 **Update controller tests** — Update `src/auth/auth.controller.spec.ts`, `src/user/controller/user.controller.spec.ts`, and `src/common/audit/audit.controller.spec.ts` to mock `@CurrentUser()` and `@RequestLang()` instead of `@Req()`. Verify existing assertions still pass.
- [x] 2.11 **VERIFY** — Run `npm test` — full suite passes. Zero `@Req() req: any` remaining for language/user access (verify with grep).

## Phase 3: WS-5 Docker Hardening

- [x] 3.1 **Restructure Dockerfile production stage** — In `Dockerfile` production stage (line 50-66): replace `COPY --from=build ... node_modules` with fresh `COPY package*.json ./` + `RUN npm ci --omit=dev`. Remove dependency on build stage's node_modules. Keep `COPY --from=build ... dist`.
- [x] 3.2 **VERIFY** — Confirm Dockerfile has no `COPY --from=build ... node_modules` or `COPY --from=development ... node_modules` instructions. Confirm `npm ci --omit=dev` is present in production stage.

## Phase 4: Integration Verification

- [x] 4.1 Run `npm test` — full suite green, zero failures.
- [x] 4.2 Run `grep -r '@Req()' src/**/*.controller.ts` — confirm zero `@Req()` for language or user access remain (only legitimate uses if any).
- [x] 4.3 Verify `src/user/entities/user.entity.ts` has `@Exclude()` on password property.
- [x] 4.4 Verify route ordering: `@Get()` appears before `@Get(':id')` in `user.controller.ts`.
