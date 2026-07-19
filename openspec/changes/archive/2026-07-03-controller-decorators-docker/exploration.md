# Exploration: controller-decorators-docker

**Change**: controller-decorators-docker
**Linear**: COU-114 (Cycle 2: Controller decorators + Docker hardening)
**Parent**: COU-112
**Date**: 2026-07-03

## Workstream WS-4: Custom Param Decorators & Controller Cleanup

### Current State Analysis

#### Gap 1: No `@CurrentUser()` decorator exists

There is **no** `@CurrentUser()` custom param decorator anywhere in the codebase. The only decorators in `src/common/decorators/` are:
- `password-strength.decorator.ts` — a class-validator decorator (not a param decorator)

Auth-related decorators live in `src/auth/decorators/`:
- `roles.decorator.ts` — `@Roles()` (SetMetadata)
- `permissions.decorator.ts` — `@RequirePermissions()` (SetMetadata)

#### Gap 2: `req.user` accessed directly in controllers

**ALL occurrences of `@Request()` / `@Req()` with `req.user` access:**

| File:Line | Pattern | Usage |
|-----------|---------|-------|
| `user-profile.controller.ts:35-36` | `@Request() req` | `req.user` — getProfile |
| `user-profile.controller.ts:46-47` | `@Request() req` | `req.user.id` — updateProfile |
| `user-profile.controller.ts:61-62` | `@Request() req` | `req.user` — changePassword |
| `user-profile.controller.ts:85-86` | `@Request() req` | `req.user` — changeEmail |
| `auth.controller.ts:45` | `@Req() req: any` | `getRequestLang(req)` — register (NOT req.user) |
| `auth.controller.ts:83` | `@Req() req: any` | `getRequestLang(req)` — forgotPassword (NOT req.user) |
| `auth.controller.ts:96` | `@Req() req: any` | `getRequestLang(req)` — resetPassword (NOT req.user) |
| `auth.controller.ts:122` | `@Req() req: any` | `getRequestLang(req)` — verifyEmail (NOT req.user) |
| `auth.controller.ts:135` | `@Req() req: any` | `getRequestLang(req)` — confirmEmailChange (NOT req.user) |
| `auth.controller.ts:148` | `@Req() req: any` | `getRequestLang(req)` — resendVerification (NOT req.user) |
| `user.controller.ts:134` | `@Req() req: any` | `getRequestLang(req)` — unlock (NOT req.user) |
| `user.controller.ts:186` | `@Req() req: any` | `getRequestLang(req)` — delete (NOT req.user) |
| `role.controller.ts:27` | `@Req() req: any` | `getRequestLang(req)` — findAll (NOT req.user) |
| `role.controller.ts:34` | `@Req() req: any` | `getRequestLang(req)` — updatePermissions (NOT req.user) |
| `permission.controller.ts:27` | `@Req() req: any` | `getRequestLang(req)` — findAll (NOT req.user) |
| `audit.controller.ts:36` | `@Req() _req: any` | NOT used — passed but unused |
| `i18n-admin.controller.ts:15` | `@Req() req: any` | `getRequestLang(req)` — reload (NOT req.user) |

**Key finding**: The `@Req() req: any` pattern is used in 13 handlers for i18n language extraction (`getRequestLang(req)`), NOT for accessing `req.user`. Only `user-profile.controller.ts` (4 methods) directly accesses `req.user`.

**The JWT strategy** (`jwt.strategy.ts:20-26`) returns a full `User` entity from `validate()`, which Passport attaches to `req.user`.

#### Gap 3: Route ordering — `@Get(':id')` before `@Get()`

In `user.controller.ts`:
- Line 95: `@Get(':id')` findById
- Line 114: `@Get()` findAll

**This is backwards.** Static routes (`@Get()`) MUST come before parameterized routes (`@Get(':id')`). Fastify will match `/admin/users` to `:id` with value `"undefined"` or fail.

Similarly for PATCH routes:
- Line 133: `@Patch(':id/unlock')` unlock
- Line 157: `@Patch(':id')` update
- Line 209: `@Patch(':id/active')` toggleActive

The `:id/unlock` and `:id/active` routes are correctly ordered BEFORE `:id` — but `@Get()` is AFTER `@Get(':id')`, which is the bug.

#### Gap 4: No `@Exclude()` on password field

The `User` entity (`user.entity.ts:31`) has `@Prop({ required: true }) password: string` with no serialization protection.

**However**: The project uses manual DTO mapping via `UserDTO.of(user)` which explicitly selects fields. The `UserDTO` constructor only copies: `id, name, lastName, email, userName, role, createdAt, updatedAt, isActive` — **password is never exposed**.

So `@Exclude()` on the Mongoose entity is **defense in depth**, not critical. The question is whether `class-transformer` `@Exclude()` works with Mongoose schemas. It does — `class-transformer` decorators are independent of the ORM. But since the project uses manual DTO mapping (not `ClassSerializerInterceptor`), adding `@Exclude()` alone won't do anything without the interceptor.

#### Gap 5: Manual serialization pattern

The project uses `UserDTO.of(user)` — a static factory that manually maps entity fields. This is:
- **Safe**: Only whitelisted fields are exposed
- **Verbose**: Every controller method must call `.of()` explicitly
- **No interceptor**: `ClassSerializerInterceptor` is not used anywhere

### Technical Approach Options

#### Option A: Create `@CurrentUser()` decorator only
- **Pros**: Minimal change, solves the 4 direct `req.user` accesses in user-profile.controller.ts
- **Cons**: Doesn't address the `@Req() req: any` pattern used for i18n (13 occurrences)
- **Effort**: Low

#### Option B: Create `@CurrentUser()` + `@RequestLang()` decorators
- **Pros**: Eliminates ALL `@Req() req: any` patterns; clean separation of concerns
- **Cons**: More decorators to maintain; `@RequestLang()` is a thin wrapper
- **Effort**: Medium

#### Option C: Create `@CurrentUser()` + compose auth endpoint decorator
- **Pros**: Reduces decorator stacking; follows `applyDecorators` pattern from skill
- **Cons**: Requires refactoring existing `@ApplyXxxDoc()` decorators
- **Effort**: Medium-High

#### Option D: Full refactor — `@CurrentUser()` + `ClassSerializerInterceptor` + route reordering
- **Pros**: Addresses ALL gaps at once
- **Cons**: Largest blast radius; more test changes needed
- **Effort**: High

### Recommendation for WS-4

**Go with Option B + route fix**:
1. Create `@CurrentUser()` in `src/common/decorators/current-user.decorator.ts`
2. Create `@RequestLang()` in `src/common/decorators/request-lang.decorator.ts` (extracts language from request)
3. Fix route ordering in `user.controller.ts` — move `@Get()` before `@Get(':id')`
4. Replace `@Request() req` → `@CurrentUser() user` in `user-profile.controller.ts` (4 methods)
5. Replace `@Req() req: any` → `@RequestLang()` where only language is needed (13 methods)
6. Keep `@Req() req: any` in audit.controller.ts as `@Req() _req` (unused, but harmless)

**Why not `ClassSerializerInterceptor`?** The manual `UserDTO.of()` pattern is already safe and explicit. Adding `@Exclude()` + interceptor would be a separate refactor (WS for serialization standardization).

### Files to Modify/Create (WS-4)

| Action | File | Change |
|--------|------|--------|
| **Create** | `src/common/decorators/current-user.decorator.ts` | `@CurrentUser()` param decorator |
| **Create** | `src/common/decorators/request-lang.decorator.ts` | `@RequestLang()` param decorator |
| **Modify** | `src/user/controller/user-profile.controller.ts` | Replace `@Request() req` → `@CurrentUser()` + `@RequestLang()` |
| **Modify** | `src/user/controller/user.controller.ts` | Fix `@Get()` ordering; replace `@Req()` → `@RequestLang()` |
| **Modify** | `src/auth/auth.controller.ts` | Replace `@Req() req: any` → `@RequestLang()` (6 methods) |
| **Modify** | `src/rbac/controllers/role.controller.ts` | Replace `@Req() req: any` → `@RequestLang()` (2 methods) |
| **Modify** | `src/rbac/controllers/permission.controller.ts` | Replace `@Req() req: any` → `@RequestLang()` |
| **Modify** | `src/common/audit/audit.controller.ts` | Remove unused `@Req() _req` |
| **Modify** | `src/common/i18n/i18n-admin.controller.ts` | Replace `@Req() req: any` → `@RequestLang()` |
| **Modify** | Tests for all affected controllers | Update mock request patterns |

---

## Workstream WS-5: Docker Production Image Hardening

### Current State Analysis

#### Dockerfile Stage Structure

```
base (node:18-alpine) → development (npm ci ALL deps) → build (copies from development) → production (copies from build)
```

**Critical findings:**

1. **Build stage copies ALL node_modules from development** (line 38):
   ```dockerfile
   COPY --from=development /usr/src/app/node_modules ./node_modules
   ```
   The `development` stage ran `npm ci` which installs **ALL dependencies including devDependencies**.

2. **Production stage copies node_modules from build** (line 54):
   ```dockerfile
   COPY --from=build /usr/src/app/node_modules ./node_modules
   ```
   The build stage's cleanup (line 45) removes `node_modules/.cache` but NOT dev dependencies.

3. **No production-only install**: There is no `npm ci --only=production` or `npm ci --omit=dev` anywhere.

4. **Base image is node:18-alpine** — acceptable but outdated (current LTS is 20+).

5. **HEALTHCHECK works** — Cycle 1 added `/health` endpoint, and the Dockerfile HEALTHCHECK command correctly hits it.

6. **`.dockerignore` is correct** — excludes `node_modules`, `dist`, `.env`, `.git`.

### Technical Approach Options

#### Option A: Production-only install in build stage
```dockerfile
FROM base AS build
COPY package*.json ./
RUN npm ci --omit=dev  # Only production deps
COPY . .
RUN npm run build
```
- **Pros**: Simple, single install
- **Cons**: Build needs dev deps for TypeScript compilation (`typescript`, `ts-node`, `@nestjs/cli` are dev deps)
- **Verdict**: **Doesn't work** — can't build without dev dependencies

#### Option B: Two-install approach (correct pattern)
```dockerfile
FROM base AS build
COPY package*.json ./
RUN npm ci                    # All deps for build
COPY . .
RUN npm run build

FROM base AS production
COPY package*.json ./
RUN npm ci --omit=dev         # Only production deps
COPY --from=build /usr/src/app/dist ./dist
```
- **Pros**: Clean separation; production image has no dev deps
- **Cons**: Two `npm ci` calls (slightly slower build)
- **Verdict**: **Recommended**

#### Option C: Prune dev deps after build
```dockerfile
FROM base AS build
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm prune --production     # Remove dev deps from node_modules
```
- **Pros**: Single install
- **Cons**: `npm prune` may leave orphaned files; less reliable than clean install
- **Verdict**: Acceptable but less clean than Option B

#### Option D: Use `npm ci --include=prod` in production stage (same as B)
Identical to Option B, just different flag syntax.

### Recommendation for WS-5

**Go with Option B** — the two-install approach:
1. Keep `development` stage as-is (for dev workflow)
2. In `build` stage: `npm ci` (all deps) → build → keep compiled output
3. In `production` stage: fresh `npm ci --omit=dev` → copy dist from build
4. Optionally bump base image from `node:18-alpine` to `node:20-alpine` (LTS)
5. Add `ENV NODE_ENV=production` before the production `npm ci` to ensure correct behavior

### Files to Modify (WS-5)

| Action | File | Change |
|--------|------|--------|
| **Modify** | `Dockerfile` | Production stage: fresh `npm ci --omit=dev`, copy only `dist` |
| **Modify** | `Dockerfile` | Optionally bump `node:18-alpine` → `node:20-alpine` |

---

## Combined Risks

1. **`@RequestLang()` decorator**: The `getRequestLang()` helper currently reads from `req.headers['accept-language']` or `req.query.lang`. The decorator must replicate this logic exactly. If the helper has edge cases, they must be preserved.

2. **Test changes**: All controllers with `@Req()` changes will need test updates. The `user-profile.controller.ts` tests mock `req.user` — these must be updated to work with `@CurrentUser()`.

3. **Docker build time**: Two `npm ci` calls add ~10-20s to build time. Acceptable tradeoff for smaller production image.

4. **Route ordering fix is breaking if someone relied on the bug**: Unlikely, but `GET /admin/users` currently might match `:id` with weird behavior.

5. **Node 18→20 bump**: Should be safe (NestJS 10 supports Node 20), but should be verified in CI.

## Ready for Proposal

**Yes.** Both workstreams are well-understood with clear approaches:
- **WS-4**: Create `@CurrentUser()` + `@RequestLang()` decorators, fix route ordering, replace 17 `@Req()` usages
- **WS-5**: Restructure Dockerfile production stage with fresh `npm ci --omit=dev`, optionally bump Node version
