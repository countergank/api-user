# COU-144: Migrate config consumers — Reemplazar process.env por ParameterService

## Intent

Reemplazar los accesos directos a `process.env` en el código de producción por el `ParameterService` construido en COU-182/COU-143, consolidando toda la configuración en un solo punto de gestión con validación, defaults, y capacidad de override en runtime via el admin endpoint.

## Scope

### In Scope

1. **Registrar nuevas definiciones de parámetros** en `ParameterRegistry` para todas las variables a migrar:
   - Email: `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_SECURE`, `EMAIL_FROM`, `RESEND_FROM_EMAIL`
   - Throttle: `THROTTLE_LIMIT`, `THROTTLE_TTL`, `LOGIN_THROTTLE_LIMIT`, `LOGIN_THROTTLE_TTL`, `REGISTER_THROTTLE_LIMIT`, `REGISTER_THROTTLE_TTL`, `FORGOT_PASSWORD_THROTTLE_LIMIT`, `FORGOT_PASSWORD_THROTTLE_TTL`

2. **Refactor email module** para que providers reciban config inyectada:
   - Hacer que `EmailProviderFactory` use `ParameterService` para resolver config
   - Refactor `SmtpProvider` y `ResendProvider` para recibir config por constructor
   - Eliminar `process.env` reads de `smtp.provider.ts`, `resend.provider.ts`, `email.provider.factory.ts`

3. **Refactor throttle system** para leer límites de `ParameterService`:
   - Implementar `DynamicThrottlerGuard` que extiende `ThrottlerGuard` con cache sync pre-poblada
   - Reemplazar `@Throttle()` estáticos por el nuevo guard
   - Eliminar `process.env` reads de `auth.controller.ts`

4. **Actualizar tests** para mockear `ParameterService` en vez de `process.env`

### Out of Scope

- `NODE_ENV` — se queda como `process.env` (necesario en bootstrap antes de DI)
- `LOG_LEVEL`, `DEBUG` — se quedan (logging de bootstrap)
- `JEST_WORKER_ID` — runtime de Jest, no es config de la app
- `EMAIL_USER`, `EMAIL_PASS`, `RESEND_API_KEY` — credenciales/secretos, se quedan en env
- Migrar `AppConfigService` — ya fue migrado en COU-141
- Parameter Decorator (COU-142) — queda para otro ticket

## Approach

### Fase 1: Parameter Definitions (bajo riesgo)
Registrar todas las nuevas definiciones con defaults, validación de tipo, y categorías.

### Fase 2: Email Module Refactor (riesgo medio)
- Cambiar factory de sync a async para poder inyectar `ParameterService`
- Providers reciben un config object tipado en vez de leer env vars
- Mantener compatibilidad con tests existentes

### Fase 3: Throttle Guard Refactor (riesgo alto)
- Crear `DynamicThrottlerGuard` con un `Map<string, number>` sync que se popula al iniciar el módulo
- Extender `ThrottlerModule` para que use el nuevo guard
- Reemplazar decoradores `@Throttle()` hardcodeados en `auth.controller.ts`
- Cache se invalida con cada actualización de parámetro vía el admin endpoint

## Risks

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Throttle decorators son sync, ParameterService es async | Alto | Usar sync cache pre-poblado en módulo init |
| Email providers usan `new Clase()` sin DI | Medio | Refactor factory a async con DI |
| Tests existentes mockean `process.env` | Medio | Actualizar mocks a `ParameterService` |
| Romper rate limiting en producción | Alto | Test coverage + deploy gradual |

## Delivery Strategy

**Single PR con `size:exception`** — el cambio está acotado (~150 LOC) y los cambios son interdependientes (no tiene sentido dividirlos en PRs encadenados).

## Review Budget

~150-200 líneas modificadas. Dentro del presupuesto de 400 líneas.

## Decisiones Abiertas

1. ¿El `DynamicThrottlerGuard` lee de cache sync o hace `await parameterService.get()` por request? → **Cache sync** (performance, la config no cambia frecuentemente)
2. ¿Invalidación del cache de throttle? → Se invalida al hacer PUT en el admin endpoint (PubSub event)
