# Spec: Dynamic Throttler Guard — Rate limits from ParameterService

## Problem
`auth.controller.ts` usa decoradores `@Throttle()` con valores hardcodeados de `process.env`. Estos decoradores se evalúan en tiempo de definición de clase y no pueden usar `ParameterService.get()` async.

## Solution: DynamicThrottlerGuard

### Architecture
1. **`DynamicThrottlerGuard`** extiende `ThrottlerGuard` de `@nestjs/throttler`
2. Mantiene un **Map sync en memoria** `Map<string, number>` con los límites por endpoint
3. El Map se **pre-puebla** al iniciar el módulo con valores de `ParameterService`
4. El guard sobreescribe `getTracker()` o `getLimitAndTtl()` para devolver los valores del Map
5. Se registra como global guard en el módulo de throttler

### Sync Cache
```typescript
interface ThrottleConfig {
  limit: number;
  ttl: number;
}

class DynamicThrottlerGuard extends ThrottlerGuard {
  private configMap = new Map<string, ThrottleConfig>();

  async onModuleInit() {
    // Load from ParameterService
    this.configMap.set('global', {
      limit: await this.parameterService.get('THROTTLE_LIMIT'),
      ttl: await this.parameterService.get('THROTTLE_TTL'),
    });
    // ... per-endpoint configs
  }

  protected async getLimitAndTtl(context, ...): Promise<[number, number]> {
    // Read from configMap, fallback to defaults
  }
}
```

### Endpoint Mapping
| Route | Config Key | Limit Env | TTL Env |
|-------|-----------|-----------|---------|
| Default (global) | `global` | `THROTTLE_LIMIT` | `THROTTLE_TTL` |
| POST /auth/login | `login` | `LOGIN_THROTTLE_LIMIT` | `LOGIN_THROTTLE_TTL` |
| POST /auth/register | `register` | `REGISTER_THROTTLE_LIMIT` | `REGISTER_THROTTLE_TTL` |
| POST /auth/forgot-password | `forgot-password` | `FORGOT_PASSWORD_THROTTLE_LIMIT` | `FORGOT_PASSWORD_THROTTLE_TTL` |

### Module Changes
- `ThrottlerModule.forRoot()` deja de leer `process.env` directamente
- Recibe configuración de `DynamicThrottlerGuard` que inyecta `ParameterService`
- Se mantiene `@nestjs/throttler` como dependencia

### Removing Static Decorators
- Sacar `@Throttle()` de los métodos del controller (el guard decide los límites)
- El guard detecta la ruta y aplica el límite correspondiente

### Files to modify
- `src/config/throttle/dynamic-throttler.guard.ts` — NEW
- `src/config/throttle/` — NEW directory
- `src/config/throttle/__tests__/dynamic-throttler.guard.spec.ts` — NEW
- `src/auth/auth.controller.ts` — remove @Throttle decorators
- `src/auth/auth.controller.spec.ts` — update mocks
- `src/app/app.module.ts` — update throttler registration
