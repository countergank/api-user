# Design: Parameter Admin Endpoint (COU-143)

> **Change**: parameter-admin-endpoint | **Linear**: COU-143
> **Status**: Draft

---

## 1. Architecture

### Module Structure

```
src/config/parameters/
├── parameter.module.ts              # MODIFY — add ParameterStore + ParameterService to providers/exports
├── parameter-admin.module.ts        # NEW — imports ParameterModule, registers controller
├── parameter-admin.controller.ts    # NEW — 3 admin endpoints
├── dto/
│   ├── update-parameter.dto.ts      # NEW — PUT request body validation
│   └── parameter-response.dto.ts    # NEW — response shape
├── parameter.service.ts             # MODIFY — add getAll(), getByGroup()
├── parameter.store.ts               # MODIFY — add getByKeys(), getDefaultsByGroup()
├── parameter-registry.ts            # NO CHANGE
├── parameter.types.ts               # NO CHANGE
├── parameter-definitions.ts         # NO CHANGE
├── index.ts                         # MODIFY — export new classes
├── __tests__/
│   ├── parameter-admin.controller.spec.ts  # NEW — controller tests
│   └── parameter.service.spec.ts           # MODIFY — test new methods
```

### Dependency Graph

```
ParameterAdminController
  ├── ParameterService (imported via constructor)
  │     ├── ParameterStore
  │     │     ├── RedisService
  │     │     ├── ParameterRegistry
  │     │     ├── ConfigService
  │     │     └── EventEmitter2
  │     └── ParameterRegistry
  └── AuditAction decorator (PUT only)
```

### Module Wiring

```typescript
// app.module.ts — add import
imports: [
  // ... existing imports
  ParameterAdminModule,  // NEW
]
```

---

## 2. Existing Module Changes

### parameter.module.ts — Add Service & Store

```typescript
@Global()
@Module({
  imports: [ConfigModule, RedisModule],  // ADD RedisModule for ParameterStore
  providers: [
    ParameterRegistry,
    { provide: ParameterRegistry, useFactory: () => { ... } },  // keep existing
    ParameterStore,     // NEW
    ParameterService,   // NEW
  ],
  exports: [
    ParameterRegistry,  // existing
    ParameterStore,     // NEW
    ParameterService,   // NEW
  ],
})
export class ParameterModule {}
```

> **Note**: `ParameterStore` depends on `RedisService` (from `RedisModule`), `ParameterRegistry`, `ConfigService`, and optional `EventEmitter2`. `ParameterModule` already imports `ConfigModule` via `ConfigModule.forRoot()`. It needs to also import `RedisModule` (sibling in `src/config/redis/`).

### RedisModule readiness check

```typescript
// src/config/redis/redis.module.ts
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
```

`RedisModule` is already `@Global()`, so importing it into `ParameterModule` is optional since it's globally available. However, explicit imports are better for clarity and module independence. **Recommendation**: add explicit import to avoid ambiguity.

---

## 3. Service Design

### ParameterService — New Methods

```typescript
// ParameterService
export interface ParameterEntry {
  key: string;
  type: ParameterType;
  value: string | number | boolean;
  default: string | number | boolean;
  group: string;
  ttl: number;
  isOverridden: boolean;
}

async getAll(): Promise<ParameterEntry[]> {
  const defs = this.registry.getAll();  // new registry method
  const keys = defs.map((d) => d.key);
  const runtimeValues = await this.store.getByKeys(keys);
  return defs.map((def) => ({
    key: def.key,
    type: def.type,
    value: runtimeValues[def.key] ?? def.default,
    default: def.default,
    group: def.group,
    ttl: def.ttl,
    isOverridden: runtimeValues[def.key] !== undefined
      && String(runtimeValues[def.key]) !== String(def.default),
  }));
}

async getByGroup(group: string): Promise<ParameterEntry[]> {
  const defs = this.registry.findByGroup(group);
  const entries = await this.getAll();
  return entries.filter((e) => e.group === group);
}
```

### ParameterRegistry — New Method

```typescript
getAll(): ParameterDefinition[] {
  return Array.from(this.parameters.values());
}
```

### ParameterStore — New Methods

```typescript
async getByKeys(keys: string[]): Promise<Map<string, string | number | boolean>> {
  const result = new Map<string, string | number | boolean>();
  const promises = keys.map(async (key) => {
    try {
      const value = await this.get(key);
      result.set(key, value);
    } catch {
      // Skip missing keys gracefully
    }
  });
  await Promise.all(promises);
  return result;
}
```

> **Key design decision**: Registry iteration + individual `get()` calls rather than Redis SCAN. This avoids O(N) SCAN on Redis key space, gives us definition metadata alongside values, and is safe for < 100 parameters.

---

## 4. Controller Design

### Route Definitions

```typescript
@Controller('admin/parameters')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class ParameterAdminController {
  constructor(private readonly parameterService: ParameterService) {}

  // GET /admin/parameters
  @Get()
  @Throttle({ default: { limit: 30, ttl: 60 } })
  async findAll(): Promise<ParameterEntry[]> {
    return this.parameterService.getAll();
  }

  // GET /admin/parameters/:group
  @Get(':group')
  @Throttle({ default: { limit: 30, ttl: 60 } })
  async findByGroup(@Param('group') group: string): Promise<ParameterEntry[]> {
    return this.parameterService.getByGroup(group);
  }

  // PUT /admin/parameters/:key
  @Put(':key')
  @Throttle({ default: { limit: 10, ttl: 60 } })
  @AuditAction({ action: 'PARAMETER_UPDATE', resource: 'parameter' })
  async update(
    @Param('key') key: string,
    @Body() dto: UpdateParameterDto,
  ): Promise<ParameterEntry> {
    // Validate key exists in registry
    if (!this.parameterService.has(key)) {
      throw new NotFoundException(`Parameter "${key}" not found`);
    }

    // Check env override
    const entry = (await this.parameterService.getAll())
      .find((e) => e.key === key);
    if (entry?.isOverridden) {
      throw new ConflictException(
        `Parameter "${key}" is overridden by environment variable and cannot be updated via API`
      );
    }

    // Coerce value based on type, then validate + store
    const coerced = this.coerceValue(key, dto.value);
    await this.parameterService.set(key, coerced);

    // Return updated entry
    return (await this.parameterService.getAll())
      .find((e) => e.key === key)!;
  }

  private coerceValue(key: string, raw: string): string | number | boolean {
    const def = this.registry.findByKey(key);
    if (!def) throw new NotFoundException();
    switch (def.type) {
      case 'number': {
        const n = Number(raw);
        if (isNaN(n)) throw new UnprocessableEntityException(`Value must be a valid number`);
        if (n <= 0 && key === 'THROTTLE_LIMIT') {
          throw new UnprocessableEntityException('Throttle limit must be greater than 0');
        }
        return n;
      }
      case 'boolean':
        if (!['true', 'false', '1', '0'].includes(raw.toLowerCase())) {
          throw new UnprocessableEntityException(`Value must be a boolean (true/false)`);
        }
        return ['true', '1'].includes(raw.toLowerCase());
      default:
        return raw;
    }
  }
}
```

### Endpoints Summary

| Method | Path | Auth | Rate Limit | Audit | Returns |
|--------|------|------|------------|-------|---------|
| GET | `/admin/parameters` | ADMIN | 30 req/min | No | `ParameterEntry[]` |
| GET | `/admin/parameters/:group` | ADMIN | 30 req/min | No | `ParameterEntry[]` |
| PUT | `/admin/parameters/:key` | ADMIN | 10 req/min | `@AuditAction()` | `ParameterEntry` |

---

## 5. DTO Design

### UpdateParameterDto

```typescript
import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateParameterDto {
  @IsString()
  @IsNotEmpty()
  value: string;
}
```

> The DTO receives the value as a string from JSON. Coercion to the correct type (number, boolean) happens in the controller's `coerceValue()` method based on the parameter's `ParameterType`. The `ParameterRegistry.validate()` then applies business rules.

### ParameterResponseDto (ParameterEntry interface)

```typescript
export interface ParameterEntry {
  key: string;
  type: 'string' | 'number' | 'boolean';
  value: string | number | boolean;
  default: string | number | boolean;
  group: string;
  ttl: number;
  isOverridden: boolean;
}
```

> This is an interface, not a class, since we don't need class-transformer serialization. NestJS will serialize it automatically.

---

## 6. Security Design

### Guard Stack (per existing pattern)

```typescript
@Controller('admin/parameters')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
```

- `JwtAuthGuard` — validates JWT token from Authorization header
- `RolesGuard` — checks user's role against `@Roles()` metadata
- `@Roles(UserRole.ADMIN)` — restricts to ADMIN role

### Rate Limiting

| Endpoint | Limit | TTL | Rationale |
|----------|-------|-----|-----------|
| GET endpoints | 30 requests | 60 seconds | Admin read operations, more generous |
| PUT endpoint | 10 requests | 60 seconds | Write operations, stricter to prevent abuse |

### Audit Logging

- `PUT /admin/parameters/:key` — decorated with `@AuditAction({ action: 'PARAMETER_UPDATE', resource: 'parameter' })`
- `GET` endpoints — no audit (consistent with existing admin read endpoints)
- The `AuditAspectInterceptor` captures `getBefore`/`getAfter` callbacks — for parameter updates we can capture the value before and after the change (see section 12)

---

## 7. Error Mapping

| Scenario | HTTP Status | Body |
|----------|-------------|------|
| Key not found in registry | `404 Not Found` | `{ statusCode: 404, message: 'Parameter "X" not found' }` |
| Env-overridden param PUT | `409 Conflict` | `{ statusCode: 409, message: 'Parameter "X" is overridden by environment...' }` |
| Validation failure (type) | `422 Unprocessable Entity` | `{ statusCode: 422, message: 'Value must be a valid number' }` |
| Validation failure (registry) | `422 Unprocessable Entity` | `{ statusCode: 422, message: 'Parameter "X" validation failed for value: Y' }` |
| Invalid param group | `200 OK` | `[]` (empty array) |
| Redis down (GET) | `200 OK` | Falls back to default values + L1 cache |
| Redis down (PUT) | `200 OK` | Updates L1 cache, publishes event. Warning logged. |

---

## 8. Edge Cases

### Env-Overridden Parameters

- `getAll()` and `getByGroup()` include `isOverridden: true` for params whose runtime value differs from the registry default AND comes from an env var
- `PUT` on an env-overridden param: returns `409 Conflict`
- The override value IS stored in Redis (survives restart), but won't be active until the env var is removed

### Empty Groups

- `GET /admin/parameters/nonexistent-group` returns `[]` with `200 OK`
- `GET /admin/parameters` still returns all params across all groups

### Expired Redis Entries

- `ParameterStore.get()` handles this: Redis miss → check registry default → seed Redis → return default
- `getAll()` and `getByGroup()` use `ParameterStore.getByKeys()` which calls `get()` per key, so expired entries transparently fall back to defaults

### Redis Down

- GET: params return defaults with L1-cached values where available
- PUT: updates L1 cache only, logs warning, publishes event
- `getAll()` still works — returns registry defaults for all params

### Concurrency

- `ParameterStore.set()` is last-writer-wins (Redis SET without NX)
- Acceptable for runtime parameters — no CAS needed
- If audit logging includes before/after values, the "before" value is the pre-update state

---

## 9. ParameterModule Import Fix

```typescript
// MODIFIED: src/config/parameters/parameter.module.ts
@Global()
@Module({
  imports: [ConfigModule, RedisModule],  // Added RedisModule
  providers: [
    ParameterRegistry,
    { provide: PARAMETER_DEFINITIONS_TOKEN, useValue: PARAMETER_DEFINITIONS },
    {
      provide: ParameterRegistry,
      useFactory: (defs: ParameterDefinition[]) => {
        const registry = new ParameterRegistry();
        for (const def of defs) {
          registry.register(def);
        }
        return registry;
      },
      inject: [PARAMETER_DEFINITIONS_TOKEN],
    },
    ParameterStore,     // NEW
    ParameterService,   // NEW
  ],
  exports: [
    ParameterRegistry,
    ParameterStore,     // NEW
    ParameterService,   // NEW
  ],
})
export class ParameterModule {}
```

---

## 10. ParameterAdminModule

```typescript
// NEW: src/config/parameters/parameter-admin.module.ts
import { Module } from '@nestjs/common';
import { ParameterModule } from './parameter.module';
import { ParameterAdminController } from './parameter-admin.controller';

@Module({
  imports: [ParameterModule],
  controllers: [ParameterAdminController],
})
export class ParameterAdminModule {}
```

---

## 11. Affected Files Summary

| File | Action | Lines (est.) |
|------|--------|-------------|
| `src/config/parameters/parameter-registry.ts` | Add `getAll()` method | +3 |
| `src/config/parameters/parameter.store.ts` | Add `getByKeys()` method | +15 |
| `src/config/parameters/parameter.service.ts` | Add `getAll()`, `getByGroup()`, `ParameterEntry` type | +35 |
| `src/config/parameters/parameter.module.ts` | Add RedisModule import, ParameterStore & ParameterService providers/exports | +10 |
| `src/config/parameters/parameter-admin.module.ts` | NEW — module | +12 |
| `src/config/parameters/parameter-admin.controller.ts` | NEW — controller with 3 endpoints | +120 |
| `src/config/parameters/dto/update-parameter.dto.ts` | NEW — DTO | +12 |
| `src/config/parameters/dto/parameter-response.dto.ts` | NEW — `ParameterEntry` interface re-export | +8 |
| `src/config/parameters/index.ts` | Export new classes | +4 |
| `src/app/app.module.ts` | Add `ParameterAdminModule` import | +2 |
| `src/config/parameters/__tests__/parameter-admin.controller.spec.ts` | NEW — controller tests | +120 |
| `src/config/parameters/__tests__/parameter.service.spec.ts` | MODIFY — add getAll/getByGroup tests | +60 |
| **Total** | | **~400** |

---

## 12. Audit Detail (Before/After capture)

For the `@AuditAction()` decorator to capture before/after values on PUT:

```typescript
@Put(':key')
@AuditAction({
  action: 'PARAMETER_UPDATE',
  resource: 'parameter',
  getBefore: async (args: any[]) => {
    const key = args[0]; // matches @Param('key')
    // Capture current value before update
    return { key, value: await this.parameterService.get(key) };
  },
  getAfter: async (args: any[], result: any) => {
    return { key: result.key, value: result.value };
  },
})
```

This requires `AuditAspectInterceptor` to support `getBefore`/`getAfter` callbacks in the decorator metadata. Verify existing implementation supports this.
