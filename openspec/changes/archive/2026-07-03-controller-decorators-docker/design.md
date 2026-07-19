# Design: Controller Decorators + Docker Hardening

## Technical Approach

Two independent workstreams for COU-114:

1. **Custom param decorators** — Replace 17 `@Req()` / `@Request()` usages across 7 controllers with typed `@CurrentUser()` and `@RequestLang()` decorators. Fix route ordering bug in `user.controller.ts`. Add `@Exclude()` defense-in-depth on the password field.
2. **Docker production isolation** — Replace the current pattern of copying dev-tainted `node_modules` from the build stage with a fresh `npm ci --omit=dev` install in the production stage.

Both workstreams are independent and can be implemented in parallel.

## Architecture Decisions

### Decision: @CurrentUser() extracts from req.user (Passport-attached entity)

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `req.user` (full User entity) | Has all fields (name, lastName, password, etc.). Already populated by JwtStrategy.validate() returning full User. | **Chosen** |
| JWT payload only (`JwtPayload`) | Only has `{ sub, email, role }`. Would lose name, lastName needed by user-profile handlers. | Rejected |
| Fresh DB lookup per request | Guarantees fresh data but adds N+1 query on every guarded request. | Rejected |

**Rationale**: `JwtStrategy.validate()` already calls `authService.validateUser(payload.sub)` which returns the full `User` entity. Passport attaches this to `req.user`. The decorator simply extracts it with proper typing — no extra DB call, no data loss.

### Decision: @RequestLang() wraps existing getRequestLang helper

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Read `Accept-Language` header directly | Duplicates existing `getRequestLang()` logic. Loses validation (es/en/pt whitelist). | Rejected |
| Read `request.lang` from i18n middleware | `nestjs-i18n` middleware is not currently setting `request.lang`. Would require middleware changes. | Rejected |
| Wrap `getRequestLang(req)` helper | Reuses tested logic, single source of truth, zero behavior change. | **Chosen** |

**Rationale**: The existing `getRequestLang()` helper already handles header parsing, trimming, lowercasing, and whitelist validation. The decorator is a thin wrapper — no duplication, no new dependencies.

### Decision: Route ordering — specific routes before parameterized

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `@Get(':id')` before `@Get()` | Current bug: `/admin/users/unlock` matches `:id` with value "unlock". | Rejected |
| `@Get()` before `@Get(':id')` | Express/Fastify router matches in declaration order. Specific routes must come first. | **Chosen** |

**Rationale**: Fastify (like Express) matches routes in declaration order. `@Get(':id')` before `@Get()` means any path segment after `/admin/users/` matches `:id`. The fix is reordering — no code logic change.

### Decision: @Exclude() on Mongoose schema property + ClassSerializerInterceptor

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `@Exclude()` on UserDTO only | DTO constructor already omits password. No added value. | Rejected |
| `@Exclude()` on Mongoose schema property | Defense-in-depth: if entity is ever serialized directly, password is excluded. Requires `ClassSerializerInterceptor`. | **Chosen** |
| Both schema + DTO | Maximum protection. Schema-level prevents accidental entity leaks; DTO-level is the normal path. | **Chosen** |

**Rationale**: `UserDTO.of()` already excludes password by construction. Adding `@Exclude()` to the Mongoose schema property is defense-in-depth — it prevents accidental `JSON.stringify(userEntity)` leaks. Requires `ClassSerializerInterceptor` at the controller or global level.

### Decision: Docker — fresh npm ci --omit=dev in production stage

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Copy node_modules from build stage | Current approach. Build stage copies from dev stage which has ALL deps. Dev deps leak into production. | Rejected |
| `npm prune --production` after copy | Prune removes dev deps but leaves behind orphaned packages and cache. Larger final image. | Rejected |
| Fresh `npm ci --omit=dev` in production | Clean install, only production deps. Smaller image, reproducible, no dev contamination. | **Chosen** |

**Rationale**: A fresh install guarantees only `dependencies` (not `devDependencies`) are present. It's reproducible, smaller, and follows Docker best practices. The two-install pattern (dev stage for tooling, prod stage for runtime) is the standard approach.

## Data Flow

### @CurrentUser() decorator resolution

```
HTTP Request (Bearer Token)
    │
    ▼
JwtAuthGuard
    │
    ▼
JwtStrategy.validate(JwtPayload)
    │  → authService.validateUser(payload.sub)
    │  → returns full User entity
    ▼
Passport attaches User to req.user
    │
    ▼
@CurrentUser() decorator
    │  → ExecutionContext → request → req.user
    │  → returns typed User
    ▼
Controller handler receives User
```

### @RequestLang() decorator resolution

```
HTTP Request (Accept-Language: es-AR,en;q=0.9)
    │
    ▼
@RequestLang() decorator
    │  → ExecutionContext → request → req.headers['accept-language']
    │  → getRequestLang(req)
    │     → split(',') → trim() → toLowerCase() → slice(0,2)
    │     → whitelist check ['es','en','pt']
    ▼
Returns: "es" | "en" | "pt" | undefined
    │
    ▼
Controller handler receives string
```

### Docker multi-stage build (before vs after)

**BEFORE (current — dev deps leak):**
```
development:  npm ci (ALL deps) ──→ node_modules [dev + prod]
     │
     ▼ (copy node_modules)
build:        npm run build ──→ dist/ + node_modules [dev + prod]
     │
     ▼ (copy node_modules)
production:   node_modules [dev + prod] ← LEAK
              dist/
```

**AFTER (clean production install):**
```
development:  npm ci (ALL deps) ──→ node_modules [dev + prod]
     │
     ▼ (copy node_modules)
build:        npm run build ──→ dist/
     │
     ▼ (copy ONLY dist/)
production:   npm ci --omit=dev ──→ node_modules [prod only]
              dist/                 ← CLEAN
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/auth/decorators/current-user.decorator.ts` | Create | `@CurrentUser()` param decorator using `createParamDecorator`, extracts `req.user` typed as `User` |
| `src/auth/decorators/request-lang.decorator.ts` | Create | `@RequestLang()` param decorator using `createParamDecorator`, wraps `getRequestLang()` |
| `src/auth/decorators/index.ts` | Create | Barrel export for auth decorators |
| `src/user/entities/user.entity.ts` | Modify | Add `@Exclude()` import and decorator on `password` property |
| `src/user/controller/user.controller.ts` | Modify | Fix route order (`@Get()` before `@Get(':id')`), replace `@Req()` with `@RequestLang()`, add `ClassSerializerInterceptor` |
| `src/user/controller/user-profile.controller.ts` | Modify | Replace `@Request() req` with `@CurrentUser()` + `@RequestLang()`, remove `getRequestLang` imports |
| `src/auth/auth.controller.ts` | Modify | Replace `@Req() req: any` with `@RequestLang()`, remove `getRequestLang` imports |
| `src/common/audit/audit.controller.ts` | Modify | Replace `@Req() _req: any` with `@RequestLang()` |
| `src/common/i18n/i18n-admin.controller.ts` | Modify | Replace `@Req() req: any` with `@RequestLang()` |
| `src/rbac/controllers/role.controller.ts` | Modify | Replace `@Req() req: any` with `@RequestLang()` |
| `src/rbac/controllers/permission.controller.ts` | Modify | Replace `@Req() req: any` with `@RequestLang()` |
| `Dockerfile` | Modify | Production stage: remove `COPY --from=build .../node_modules`, add `COPY package*.json ./` + `RUN npm ci --omit=dev` |
| `src/auth/decorators/current-user.decorator.spec.ts` | Create | Unit tests for @CurrentUser decorator |
| `src/auth/decorators/request-lang.decorator.spec.ts` | Create | Unit tests for @RequestLang decorator |
| `src/user/controller/user.controller.spec.ts` | Modify | Update tests for route order fix and decorator changes |

## Interfaces / Contracts

### @CurrentUser() decorator

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../user/entities/user.entity';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

### @RequestLang() decorator

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { getRequestLang } from '../../common/i18n/request-lang.helper';

export const RequestLang = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return getRequestLang(request);
  },
);
```

### User entity password exclusion

```typescript
import { Exclude } from 'class-transformer';

// Inside User class:
@Exclude()
@Prop({ required: true })
password: string;
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `@CurrentUser()` returns `req.user` | Mock `ExecutionContext`, verify extraction |
| Unit | `@CurrentUser()` returns undefined when no user | Mock request without user, verify undefined |
| Unit | `@RequestLang()` returns correct lang code | Mock `Accept-Language` header, verify output |
| Unit | `@RequestLang()` returns undefined for missing header | Mock empty headers, verify undefined |
| Unit | `@RequestLang()` validates whitelist | Mock `Accept-Language: fr`, verify undefined |
| Unit | Route order: `GET /admin/users` matches list, not `:id` | Controller unit test verifying method dispatch |
| Unit | `@Exclude()` on password: entity serialization omits password | Use `ClassSerializerInterceptor` + `plainToClass` |
| Integration | Controllers with new decorators return correct responses | Test module with real decorator providers |
| E2E | Docker production image has no devDependencies | Build Docker image, verify `node_modules` contents |

## Migration / Rollout

No migration required. This is a refactoring change with zero behavioral change:
- Decorators are drop-in replacements for existing `@Req()` patterns
- Route ordering fix corrects a bug — no API contract change
- `@Exclude()` is defense-in-depth — existing DTO mapping already protects password
- Docker change only affects build process — runtime behavior unchanged

Rollout: single PR, all changes verified by existing test suite + new decorator unit tests.

## Open Questions

- [ ] Should `ClassSerializerInterceptor` be applied globally (in `main.ts`) or per-controller? Per-controller is safer for this scoped change, but global would protect all controllers from accidental entity leaks.
