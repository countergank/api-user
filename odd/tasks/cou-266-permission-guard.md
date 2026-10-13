# COU-266 — Aplicar la verificación de permisos en los endpoints protegidos

**Rama:** `feat/cou-266-permission-guard` (desde `develop`)
**Issue:** https://linear.app/countergank/issue/COU-266/aplicar-la-verificacion-de-permisos-en-los-endpoints-protegidos
**Depende de:** COU-265 (permisos efectivos en `request.user.permissions`) — MERGEADO (#417)
**Bloquea a:** dashboard admin (ui-user) necesita recibir 403/200 correctos para decidir qué mostrar

## Objetivo

Encender el RBAC que ya está escrito pero desconectado: montar `PermissionGuard` y
decorar cada endpoint con `@RequirePermissions()` según el catálogo, de modo que la
autorización por permisos sea HTTP-observable (401 sin token / 403 sin permiso / 200 con permiso).

## Problema (estado actual, verificado por exploración)

- `APP_GUARD` solo monta `DynamicThrottlerGuard` (`src/app/app.module.ts:38-41`). No hay
  `JwtAuthGuard` ni `PermissionGuard` globales.
- `PermissionGuard` (`src/auth/guards/permissions.guard.ts:6-49`) y `@RequirePermissions`
  (`src/auth/decorators/permissions.decorator.ts:3-4`) existen y **no se usan en ningún endpoint**.
- No existe `@Public`/`IS_PUBLIC_KEY` (grep global sin matches).
- `PermissionGuard` **sin metadata → `return true`** (`permissions.guard.ts:16-18`);
  con metadata y sin `request.user` → 401 `INVALID_TOKEN` `UA-SEC-001` (`:23-25`, fix T9 de la
  ronda de review); `*` pasa todo (`:30`);
  exige todas (`every`) con match exacto o `<resource>:*` (`:34-40`); authenticated sin el permiso → `FORBIDDEN`
  → `UA-SEC-002`, 403 (`src/common/errors/error-kind.ts:151-157`).

### Endpoints hueco (solo-JWT o sin guard)

| Endpoint | Hoy | Debe ser |
| -- | -- | -- |
| `GET /roles` (`role.controller.ts:29`) | JWT + `RolesGuard` **sin `@Roles`** → pasa cualquiera | `role:read` |
| `GET /permissions` (`permission.controller.ts:25`) | solo JWT | `permission:read` |
| `POST /admin/i18n/reload` (`i18n-admin.controller.ts:14`) | solo JWT | `i18n:reload` |
| ⚠️ `POST /message-microservice/:message-pattern` (`app.controller.ts:49`) | **sin auth alguna**, oculto de Swagger | **fuera de scope** (ver Decisiones) |

### Endpoints ya protegidos por `@Roles(ADMIN)` (falta la capa de permisos)

- `admin/users/*` (`user.controller.ts:44-130`), `admin/parameters/*`
  (`parameter-admin.controller.ts:12-30`), `admin/audit-logs` (`audit.controller.ts:18-28`),
  `email/*` (`email.controller.ts:14-26`), `email/templates/*`
  (`email-template.controller.ts:20-53`), `PUT /roles/:id/permissions`
  (`role.controller.ts:36-37`).

### Self-service (solo-JWT, sin permiso — no regresión)

- `GET/PATCH /users/profile`, `POST /users/change-password`, `POST /users/change-email`
  (`user-profile.controller.ts:20-77`).

## Catálogo

**Sembrado hoy** (`permission.service.ts:12-25`, 12 permisos):
`user:create|read|update|delete`, `role:create|read|update|delete`,
`permission:create|read|update|delete`.

**Falta sembrar** (los usa el issue): `user:unlock`, `parameter:read|update`,
`audit:read`, `email:read|create|update|delete|send`, `i18n:reload`.
→ Ampliar `DEFAULT_PERMISSIONS` (con categoría correcta) + `PermissionCategory` si hace falta.

**Roles** (`role.service.ts:22-44`): `admin` = `['*']`; `user` = `['user:read','user:update']`;
`viewer` = `['user:read']`. (Los `permissionIds` guardan **nombres**, no ObjectIds.)

## Scope (autorizado)

1. Ampliar el catálogo de permisos sembrado (los faltantes del issue).
2. Montar `PermissionGuard` en los controllers protegidos (`@UseGuards(JwtAuthGuard, PermissionGuard)`
   o sumarlo al array existente, **después** de `JwtAuthGuard`).
3. `@RequirePermissions(...)` por endpoint según la matriz.
4. Aplicar `@Roles` faltante donde corresponda (`GET /roles`).
5. Tests unit (guard) + e2e de la **matriz rol × endpoint** (401/403/200).
6. Swagger en cada endpoint tocado (documentar 403) + i18n del código `UA-SEC-002`.

**Fuera de alcance**: rediseño del modelo de roles (A10 = COU-269); endpoint
`/message-microservice` (sin auth — ver Decisiones); permisos CRUD por API (COU-269).

## Matriz de permisos propuesta (rol × endpoint)

| Endpoint | Permiso requerido |
| -- | -- |
| `POST /admin/users` | `user:create` |
| `GET /admin/users`, `GET /admin/users/:id` | `user:read` |
| `PATCH /admin/users/:id`, `PATCH /admin/users/:id/active` | `user:update` |
| `DELETE /admin/users/:id` | `user:delete` |
| `PATCH /admin/users/:id/unlock` | `user:unlock` |
| `GET /roles` | `role:read` |
| `PUT /roles/:id/permissions` | `role:update` |
| `GET /permissions` | `permission:read` |
| `GET /admin/parameters`, `GET /admin/parameters/:group` | `parameter:read` |
| `PUT /admin/parameters/:key` | `parameter:update` |
| `GET /admin/audit-logs` | `audit:read` |
| `POST /email/send`, `POST /email/send-direct` | `email:send` |
| `POST /email/templates` | `email:create` |
| `GET /email/templates`, `GET /email/templates/:slug` | `email:read` |
| `PATCH /email/templates/:slug` | `email:update` |
| `DELETE /email/templates/:slug` | `email:delete` |
| `POST /admin/i18n/reload` | `i18n:reload` |
| `/users/profile*` (4) | solo JWT (self-service) |
| `auth/*` (8), `GET /`, `GET /health` | públicos |

## Decisiones

1. **Montaje NO global**: `PermissionGuard` va en `@UseGuards` por controller, después de
   `JwtAuthGuard`. Motivo: los guards `APP_GUARD` corren **antes** que los de controller,
   así que un `PermissionGuard` global vería `request.user` vacío y daría 403 espurio.
   Además `PermitGuard` sin metadata ya deja pasar → no rompe endpoints sin decorar.
2. **Se mantiene `@Roles(ADMIN)` donde ya está** + se agrega la capa de permisos
   (defensa en profundidad; hoy solo `admin` tiene esos permisos). Deuda conocida: si a
   futuro un rol no-admin recibe el permiso, `@Roles` lo bloquearía → se revisa en A10/COU-269.
3. **Self-service (`/users/profile*`) queda solo-JWT**: leer/editar el propio perfil no
   debe exigir `user:read/update` (un rol sin esos permisos no podría gestionarse a sí mismo).
4. **`POST /message-microservice/:message-pattern`: FUERA DE SCOPE.** No requiere ni JWT
   (agujero distinto a los 3 del issue) y no está en el issue; protegerlo puede romper la
   integración con el microservicio. Se reporta al usuario para decidir (ticket aparte).
5. **CHANGELOG: no se toca por PR (decisión del usuario).** El CHANGELOG se arma en el **tag**
   de release, no ticket por ticket. La nota de cambio de contrato de COU-266 se documentará en
   ese momento (la sección `[Unreleased]` del repo la mantiene el release, no el PR).
6. **Churn de formato revertido.** `biome format --write` (paso de normalización previo al review)
   reformateó código preexistente en 4 archivos ajenos a COU-266 (imports colapsados, firmas
   re-wrapeadas). Se restauró HEAD y se re-aplicaron **solo** las líneas semánticas
   (script determinista, 21 ediciones con assert de match único). Diff enfocado: **178/+21-**
   en vez de 200/+66-. Motivo: el repo tiene deuda de formato preexistente (archivos no tocados
   también fallan `biome format`), así que normalizar todo mete ruido ajeno al ticket.

## Checklist

- [x] T1 — Exploración del estado de autorización (hecho: mapa completo con path:line).
- [x] T2 — Diseño: matriz rol × endpoint + catálogo + decisiones (este doc).
- [x] T3 — Ampliar `DEFAULT_PERMISSIONS` con los permisos faltantes + unit del seed.
      (Nota: `seedDefaultPermissions()` reescrito idempotente por `name`; `test/global-setup.js` también.)
- [x] T4 — Montar `PermissionGuard` + `@RequirePermissions` en los endpoints de la matriz
      (incl. `GET /roles` con permiso explícito `role:read`, sin `@Roles`).
- [x] T5 — Unit: `PermissionGuard` (metadata ausente/presente, `*`, `resource:*`, sin user,
      permiso faltante → 403 `UA-SEC-002`) + unit del seed idempotente.
- [x] T6 — E2E: matriz rol × endpoint (`test/e2e/rbac/permission-guard.e2e-spec.ts`).
      **Ejecutado 10/10 PASS** (Docker habilitado). Suite e2e completa **163/163 PASS**.
      Regresión esperada corregida: `test/e2e/i18n-admin/i18n-admin.e2e-spec.ts` asumía 201
      para no-admin en `POST /admin/i18n/reload` (el agujero #3 del issue) → ahora espera 403 `UA-SEC-002`.
- [x] T7 — Swagger en endpoints tocados (403 vía `applyDecorators`+`ApiForbiddenResponse`
      en `RequirePermissions`) + i18n `es/en/pt` del `UA-SEC-002` ya presente (`errors.FORBIDDEN`).
- [x] T8 — Verificación: unit FULL (**738**) + e2e completo (**163/163**) + `tsc --noEmit` **0** +
      lint sin errores nuevos. La matriz HTTP real (supertest sobre Mongo/Redis reales) cubre el
      401/403/200 que se iba a verificar con curl live.
- [ ] T-Cierre — work-unit commit(s) → PR a `develop` (mensaje en español) → comentario Linear.
      (IDs `T9`–`T14` de la ronda de review son del triage de review, independientes de este checklist.)

## Verificación (T3–T8)

Ejecutada en foreground, rama `feat/cou-266-permission-guard`:

1. `npx jest src/auth/guards/permissions.guard.spec.ts src/rbac/services/permission.service.spec.ts --forceExit`
   → **PASS**: 2 suites, 29 tests (28 tras TDD RED: 3 fallos esperados que motivaron la implementación).
2. `npm run test:unit`
   → **PASS**: 67 suites, 738 tests.
3. `npm run lint`
   → **pre-existente y ajeno a este cambio**: 20 violaciones de reglas (biome) repartidas en
   8 archivos **no tocados** (`src/common/errors/error-kind.spec.ts`,
   `src/common/filters/all-exceptions.filter.ts`, `src/common/logger-config.spec.ts`,
   `src/config/custom-module-options/mongoose-module-option.spec.ts`,
   `src/config/parameters/__tests__/*`, `src/email/__tests__/smtp.provider.spec.ts`,
   `src/user/repository/user.repository.spec.ts`). **0** en archivos de este cambio.
4. `npx tsc --noEmit -p tsconfig.json` → **exit 0** (type-check completo OK).
5. `npm run test:e2e` (con Docker/Mongo/Redis activos)
   → **PASS**: 15 suites, 163 tests. El spec nuevo `test/e2e/rbac/permission-guard.e2e-spec.ts` 10/10.
   `globalSetup` reportó `Seeded 10 missing default permissions` (prueba del seed idempotente por name).
   Se corrigió `test/e2e/i18n-admin/i18n-admin.e2e-spec.ts`: esperaba 201 para no-admin (el agujero
   #3 del issue) → ahora 403 `UA-SEC-002`.

**TDD**: RED observado en `permission.service.spec.ts` (DEFAULT_PERMISSIONS sin los nombres nuevos;
seed insertando todo; seed no-op inexistente) → implementación → GREEN. El `permissions.guard.spec.ts`
no admite RED (el guard ya era correcto per decisión #5); sus tests nuevos pasan directo (GREEN).

## Ronda de review nativa — fixes aceptados (T9–T14)

Una review nativa de 4 lentes produjo 14 hallazgos. El parent hizo el triage: estos son los
aceptados e implementados en esta ronda. Los rechazados se listan más abajo con su motivo.

### T9 — `PermissionGuard` responde 401 cuando no hay usuario autenticado

El guard lanzaba `FORBIDDEN` (403 `UA-SEC-002`) si había metadata de permisos pero no
`request.user`. Un pedido sin identidad es autenticación, no autorización: ahora reutiliza el kind
existente `INVALID_TOKEN` (401 `UA-SEC-001`), el mismo que usa `JwtAuthGuard`. No se creó un kind
nuevo ni se tocó `error-kind.ts`. Se mantiene `FORBIDDEN` (403) para "autenticado pero sin el permiso".

- Archivos: `src/auth/guards/permissions.guard.ts`, `src/auth/guards/permissions.guard.spec.ts`.
- TDD: RED observado (el spec esperaba `INVALID_TOKEN` y recibía `FORBIDDEN`) → cambio del guard → GREEN.

### T10 — Sembrado de permisos a prueba de carrera

`seedDefaultPermissions()` leía los nombres existentes, filtraba y llamaba `createMany` →
`insertMany`. Un sembrador concurrente (bootstrap de la app + global setup de tests) podía insertar el
mismo permiso entre la lectura y el insert, y el `BulkWriteError` por clave duplicada abortaba todo el
seed. Ahora:

- `insertMany(..., { ordered: false })`: un duplicado no aborta el resto del lote.
- Se toleran errores de clave duplicada (código MongoDB `11000`) como benignos vía
  `isDuplicateKeyError()`; se loguea en `warn` y no se lanza por un permiso ya existente.
- La invalidación de caché se mantiene aunque se tolere el duplicado.
- Unit: (a) todos faltantes → inserta todos con `{ ordered: false }`; (b) algunos existentes → inserta
  solo los faltantes; (c) `insertMany` rechaza con duplicado → no lanza.

### T11 — Hacer visible una caché rota

Los fallbacks de lectura/escritura de caché de `permission.service.ts` logueaban en `debug` (invisible
en producción), así que no se podía distinguir "caché sana" de "caché rota pero la DB nos salva". Se
promovieron a `warn` los 6 logs de fallback de `get`/`set` (permissions:all, por-nombre y
`treating as miss`), preservando los mensajes. Sin cambios de flujo de control ni métricas nuevas.

### T12 — Cobertura HTTP de la matriz de permisos (la tarea más grande)

`test/e2e/rbac/permission-guard.e2e-spec.ts` cubría solo 3 endpoints protegidos. Ahora:

- Tabla `PROTECTED_ENDPOINTS` con los **22** endpoints protegidos de la matriz; un `it.each` afirma
  **403 + `UA-SEC-002`** para cada uno. En NestJS los guards corren antes de los pipes, por lo que las
  aserciones 403 no necesitan body válido.
- Se mantienen las aserciones 200 existentes y se agregaron 200 solo donde el fixture alcanza sin
  sembrado pesado nuevo: `GET /admin/users`, `GET /admin/parameters`, `GET /admin/audit-logs`,
  `GET /email/templates` y `POST /admin/i18n/reload` (**201 Created**, su status real).
- **R3-002** (self-service): `PATCH /users/profile` (200), `POST /users/change-password` (400 con
  password actual incorrecta) y `POST /users/change-email` (200); los tres con `not.toBe(403)` explícito.
- **R3-003** (wildcards HTTP): un usuario con `*` y otro con `role:*` obtienen 200 en `GET /roles`.
- Se mantienen los casos **401 sin token** y **403 `UA-SEC-002`**.
- `test/helpers/seed-rbac-users.ts`: `seedRbacUser` acepta un cuarto parámetro `permissions`
  (default `[]`) para sembrar `*`/`resource:*` sin inventar roles nuevos.

Endpoints protegidos **sin** cobertura 200 deliberada y motivo (el guard se prueba igual en el 403):

| Endpoint(s) | Motivo de no agregar 200 |
| -- | -- |
| `POST /admin/users` | muta estado (crea usuario); fuera de la cobertura 200 liviana |
| `GET /admin/users/:id` | requiere un id real, no expuesto por el fixture |
| `PATCH /admin/users/:id`, `PATCH /admin/users/:id/active`, `DELETE /admin/users/:id`, `PATCH /admin/users/:id/unlock` | mutan estado y requieren un objetivo real |
| `GET /admin/parameters/:group` | el grupo debe existir; el 403 ya valida el guard |
| `PUT /admin/parameters/:key` | muta parámetros |
| `POST /email/send`, `POST /email/send-direct` | dependen de SMTP/proveedor externo |
| `POST /email/templates` | muta estado (crea plantilla) |
| `GET /email/templates/:slug` | requiere un slug existente |
| `PATCH /email/templates/:slug`, `DELETE /email/templates/:slug` | mutan estado y requieren un slug existente |

Nota de orden de guards: en los endpoints con `@Roles(ADMIN)` donde el rol `user` **sí** posee el
permiso requerido (`user:read`/`user:update`), quien rechaza es `RolesGuard`; en el resto rechaza
`PermissionGuard`. Ambos producen el mismo contrato `FORBIDDEN` → 403 `UA-SEC-002`, que es lo que se
afirma. (`GET /roles`, `GET /permissions` y `POST /admin/i18n/reload` no llevan `@Roles`, así que ahí
el rechazo es siempre del `PermissionGuard`.)

### T13 — Documentar el footgun de permisos vacíos

Se amplió el JSDoc de `RequirePermissions` (`src/auth/decorators/permissions.decorator.ts`):
`@RequirePermissions()` sin argumentos deja una lista vacía, y el guard trata metadata ausente **o**
vacía como "sin permiso requerido" y deja pasar el request. Sin cambios de runtime. Excepción al
test-first: cambio solo de comentario; se validó con `tsc --noEmit` y `lint`.

### T14 — Deduplicación del catálogo: decisión aceptada (no forzar)

`test/global-setup.js` duplica el array de 22 entradas `DEFAULT_PERMISSIONS` de
`src/rbac/services/permission.service.ts`. Unificar en una sola fuente consumible por TypeScript (Nest)
y JS plano (global setup) requeriría `resolveJsonModule`/`allowJs` en `tsconfig.json` (hoy ausentes) o
transformar el global setup antes de que corra (jest lo ejecuta como JS plano). Eso es churn de
`tsconfig`/jest, así que **no se fuerza**: la duplicación queda como decisión deliberada y aceptada,
documentada aquí. Consecuencia operativa: un permiso nuevo debe agregarse en **ambos** lugares.

### Rechazados (no implementados)

| ID | Hallazgo | Motivo de rechazo (parent) |
| -- | -- | -- |
| R4-001 (CRÍTICO) | "fallback / retry / fail-open" en el guard de autorización | Fail-open en un guard de autorización es un agujero de seguridad; fail-closed es lo correcto. |
| R4-005 | probe `/health` para la capa de permisos | Sus dependencias (Mongo, Redis) ya se monitorean; un probe del `Reflector` no aporta. |
| R2-001 | cambiar/quitar la descripción Swagger que lista los permisos | Es útil para los consumidores de la API. |
| R2-002 | cambiar el tipado del catálogo | FALSO POSITIVO: ya usa `PermissionCategory.USER`/`SYSTEM`. |
| R2-004 | refactorizar el patrón find-then-filter del seed | Es claro e idempotente (y T10 lo hace seguro ante carreras). |
| R4-006 | caos/carga (Redis caído, timeout de Mongo) | Fuera de alcance. |

### Verificación de la ronda de review (T9–T14)

Ejecutada en foreground, rama `feat/cou-266-permission-guard`:

1. `npx jest src/auth/guards/permissions.guard.spec.ts --forceExit` → **PASS**: 1 suite, 9 tests.
   TDD T9: RED (esperaba `INVALID_TOKEN`, recibía `FORBIDDEN`) → implementación → GREEN.
2. `npx jest src/rbac/services/permission.service.spec.ts --forceExit` → **PASS**: 22 tests.
   TDD T10: RED (2 fallos: `ordered:false` ausente y duplicado no tolerado) → implementación → GREEN.
3. `npm run test` → **PASS**: 67 suites, 740 tests (antes 738).
4. `npm run test:e2e` → **PASS**: 15 suites, 195 tests (antes 163; +32 por la matriz).
5. `npx tsc --noEmit --incremental false` → **exit 0**. `npx tsc --noEmit` a secas falla solo por
   `EACCES` al escribir `dist/tsconfig.tsbuildinfo` (dir root-owned por el contenedor Docker): permiso
   de entorno, **no** un error de tipos.
6. `npm run lint` → pre-existente y ajeno: violaciones biome en archivos no tocados; **0** en archivos
   de esta ronda.

## Criterios de aceptación (del issue)

- [x] `user` sin `role:update` → 403 en `PUT /roles/:id/permissions`. (e2e ✓)
- [x] Sin token → 401; con token sin permiso → 403 con `UA-SEC-002`. (e2e ✓)
- [x] `admin` (`*`) pasa todos los controles. (e2e ✓)
- [x] Matriz rol × endpoint documentada y ejecutada. (e2e ✓ 195/195 tras la ronda de review)
- [x] Sin regresión en endpoints públicos o solo-JWT. (e2e ✓: `/health`, `/auth/login`, `/users/profile`)

## Fuera de alcance (issue)

Rediseño del modelo de roles (A10). Sin `@AuditAction` nuevos (no hay mutaciones nuevas).

## Estimación / delivery

Tamaño real tras limpiar el churn de formato: **~397 líneas de código** (14 archivos tracked
= 178 insertions + 21 deletions = 199; nuevos sin trackear = `test/e2e/rbac/permission-guard.e2e-spec.ts`
147 + `test/helpers/seed-rbac-users.ts` 51 = 198). La feature doc no se cuenta como código.

→ **Por debajo del presupuesto de review (400)**: **single-PR** alcanza; no hace falta partir
en PRs encadenados. Mensaje del PR en español, `Closes COU-266`.

### Ronda de review (T9–T14) — impacto en delivery

La ronda de review agrega **263 inserciones / 25 deleciones** de código (la feature doc no se cuenta):
`permission.service.ts` 51/8, `permission.service.spec.ts` 23/0, `permission-guard.e2e-spec.ts` 165/9,
`permissions.decorator.ts` 14/3, `permissions.guard.ts` 1/1, `permissions.guard.spec.ts` 3/3 y
`seed-rbac-users.ts` 6/1.

Con eso el acumulado de la rama supera el presupuesto de review (400), por lo que la estrategia de
entrega **queda a decisión del parent**: promover esta ronda como un segundo PR encadenado sobre el PR
base de COU-266 es la opción natural (es un work-unit propio: guard 401 + seed race-safe + visibilidad
de caché + cobertura HTTP). No se tomó esa decisión acá.
