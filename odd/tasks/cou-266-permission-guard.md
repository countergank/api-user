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
  con metadata y sin `request.user` → `FORBIDDEN` (`:23-25`); `*` pasa todo (`:30`);
  exige todas (`every`) con match exacto o `<resource>:*` (`:34-40`); falla → `FORBIDDEN`
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
- [ ] T9 — Cierre: work-unit commit(s) → PR a `develop` (mensaje en español) → comentario Linear.

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



## Criterios de aceptación (del issue)

- [x] `user` sin `role:update` → 403 en `PUT /roles/:id/permissions`. (e2e ✓)
- [x] Sin token → 401; con token sin permiso → 403 con `UA-SEC-002`. (e2e ✓)
- [x] `admin` (`*`) pasa todos los controles. (e2e ✓)
- [x] Matriz rol × endpoint documentada y ejecutada. (e2e ✓ 163/163)
- [x] Sin regresión en endpoints públicos o solo-JWT. (e2e ✓: `/health`, `/auth/login`, `/users/profile`)

## Fuera de alcance (issue)

Rediseño del modelo de roles (A10). Sin `@AuditAction` nuevos (no hay mutaciones nuevas).

## Estimación / delivery

Tamaño real tras limpiar el churn de formato: **~397 líneas de código** (14 archivos tracked
= 178 insertions + 21 deletions = 199; nuevos sin trackear = `test/e2e/rbac/permission-guard.e2e-spec.ts`
147 + `test/helpers/seed-rbac-users.ts` 51 = 198). La feature doc no se cuenta como código.

→ **Por debajo del presupuesto de review (400)**: **single-PR** alcanza; no hace falta partir
en PRs encadenados. Mensaje del PR en español, `Closes COU-266`.
