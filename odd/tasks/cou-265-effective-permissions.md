# COU-265 — Resolver los permisos efectivos del usuario desde su rol

- **Feature**: `cou-265-effective-permissions`
- **Issue**: https://linear.app/countergank/issue/COU-265/resolver-los-permisos-efectivos-del-usuario-desde-su-rol
- **Base**: `develop` — **Rama**: `feat/cou-265-effective-permissions`
- **Estado**: EN PROGRESO

## Objetivo

`request.user.permissions` siempre está vacío porque nunca se resuelve desde el rol.
`RoleService.getPermissionsForRole()` es código muerto. Sin permisos efectivos en el
request, COU-266 y COU-267 no pueden funcionar.

## Regla de resolución (decisión de diseño — documentada)

**Efectivo = unión dedup de `Role.permissionIds` ∪ `user.permissions` explícitos.**

- El rol es la base: un usuario con `permissions: []` hereda los permisos de su rol.
  (AC #1: rol `user` → `['user:read', 'user:update']`). Por eso NO puede ser override
  total: override haría que `permissions: []` anule al rol, contradiciendo el AC #1.
- Los `user.permissions` explícitos son grants adicionales que se conservan (AC #2).
- `*` se propaga tal cual (admin), sin lógica especial.
- Se aplica al construir `request.user` en `AuthService.validateUser` (que es quien
  llama `JwtStrategy.validate`), devolviendo un clone del documento (preserva
  prototype/getters de Mongoose como `id`) con `permissions` = efectivo. NUNCA se
  muta el documento cacheado ni se cachea el efectivo.
- Invalidez de caché:
  - Rol → `updatePermissions` invalida `cache:rbac:roles:*` (patrón roto, se corrige)
    y además purga `user:<id>` de los usuarios de ese rol (nuevo
    `UserService.invalidateUsersByRole` + `UserRepository.findIdsByRole`).
  - Usuario → `UserService.update/unsetFields/updateUser` ya invalidan `user:<id>`
    (verificado: user.service.ts:234).

## Problema hallado (dentro de scope)

`CacheService.delByPattern` escanea con el patrón tal cual se pasa, pero las claves
reales llevan prefijo `cache:` (ver cache.service.spec.ts:184-191). `role.service.ts`
llama `delByPattern('rbac:roles:*')` y `delByPattern('rbac:roles:name:*')` SIN el
prefijo → **no invalida nada** → los permisos de rol quedan stale hasta 10 min (TTL).
Rompe el AC #3. Se corrige a `cache:rbac:roles:*` y `cache:rbac:roles:name:*`.

> Nota (RESUELTA en el mismo trabajo): `permission.service.ts:134,149` tenía el mismo
> defecto de patrón (`rbac:permissions:name:*`). Se corrigió a `cache:${PERM_NAME_PREFIX}*`
> + spec actualizado (RED→GREEN), por decisión del usuario: misma clase de invalidación
> de caché que el fix de roles; era deuda sin ticket dueño.

## Scope (autorizado)

1. Regla de resolución (unión) en `AuthService.validateUser` (+ helper exportado).
2. Inyección de `RoleService` en `AuthService` (`AuthModule` importa `RbacModule`).
3. Invalidez de caché: fix de patrones en `role.service` + invalidación de usuarios
   del rol (`UserService`/`UserRepository`).
4. Tests unitarios (resolution + invalidation) y e2e de `request.user.permissions`.
5. Mismo defecto de patrón en `permission.service.ts` (`create`/`createMany`) →
   `cache:${PERM_NAME_PREFIX}*` (decidido con el usuario; era deuda sin dueño).

**Fuera de alcance** (issue): aplicar verificación en endpoints (COU-266), exponer en
`/auth/me` (COU-267), shipping de permisos en login, `JwtPayload` (se mantiene
`{sub, email, role}`), register público (guardrail — no tocar).

## Checklist

- [x] T1 — Exploración: flujo `JwtStrategy.validate` → `AuthService.validateUser` →
      `RoleService.getPermissionsForRole`; caché de usuario y rol; módulos; harness e2e.
- [x] T2 — Diseño: regla de unión, clone sin mutar caché, invalidaciones.
- [x] T3 — RED/GREEN unitarios: `mergeEffectivePermissions` (base/unión/dedup/`*`/vacíos);
      `validateUser` (cache-hit, cache-miss con document-like stub y no-mutación del
      origen, unión+dedup, wildcard, rol sin permisos); `role.service` (patrones
      prefijados + `invalidateUsersByRole`); `user.service`/`user.repository`
      (`invalidateUsersByRole`, `findIdsByRole`).
- [x] T4 — GREEN: `auth.service.ts`, `role.service.ts`, `auth.module.ts`,
      `rbac.module.ts`, `user.service.ts`, `user.repository.ts`.
- [x] T5 — E2E escrito y **EJECUTADO VERDE**: `test/e2e/rbac/permissions-resolution.e2e-spec.ts`
      (login real → `JwtStrategy.validate` → permisos efectivos; unión explícita; cambio
      de rol reflejado sin restart; smoke HTTP de identidad). **4/4 ACs**.
- [x] T6 — Verificación: unit FULL y lint en verde (evidencia abajo); `test:e2e`
      **DESBLOQUEADO** (Docker engine activo + `mongo-init`) → **14 suites / 153 tests,
      0 fallos**. RDD: tier alta → self-verification + verificación independiente +
      spot check del parent (aplicado).
- [x] T7 — Invalidación verificada en vivo contra Redis real (server + Mongo + Redis):
      `PUT /roles/:id/permissions` purga `cache:rbac:roles:name:<rol>` y
      `cache:user:<id>` de todos los usuarios del rol; no toca keys ajenas.
- [x] T8 — Fix del mismo defecto de patrón en `permission.service.ts` (`create`/
      `createMany` → `cache:${PERM_NAME_PREFIX}*`), por decisión del usuario.
      RED: spec con expectativa prefijada falla (2 tests). GREEN: código corregido →
      16/16. Unit FULL sigue 67/732. Lint 0 errores en los 2 archivos.
- [x] T9 — Cierre: 2 work-unit commits (autorizado por el usuario):
      1) `c3050d8` `feat(rbac): resolve effective user permissions…`;
      2) `65a49ef` `fix(rbac): prefix cache invalidation patterns…`.
      Push OK → **PR #417** → develop (https://github.com/countergank/api-user/pull/417).
      Comentario de cierre publicado en Linear COU-265 (comment `637b3e4a-…`).

## Verificación observada

- Unit FULL: `npm run test:unit` → **67 suites / 732 tests, todos en verde**
  (baseline previo: 717; +15 tests nuevos).
- Lint: `npm run lint` → 30 errores **preexistentes**, idénticos base↔rama
  (comparación determinista `biome lint --max-diagnostics=500` + diff de
  `file:line:col` = vacío → **0 errores nuevos**).
- `any` nuevos en el diff: **0** (los `as any` del spec se reemplazaron por
  `as unknown as User`; el único match de `any` es texto de un comentario).
- Verificación independiente (subagente adversarial) → 3 defectos hallados y corregidos:
  - **D1/D4**: el "clone" previo (`Object.assign(Object.create(proto), user, {…})`)
    compartía `_doc` y mutaba el documento origen; reemplazado por una proyección plain
    (`toPlainUser()` vía `toObject()`, con fallback spread para el objeto cacheado),
    alineado con lo que ya devolvía el cache-hit (objeto plano JSON). Sin `any`.
  - **D2**: el e2e competía con `rbac.e2e-spec` sobre el rol `user` (workers paralelos,
    Mongo/Redis compartidos) → el spec pasó a usar el rol `viewer` (nadie más lo muta).
  - **D3**: el test de no-mutación era tautológico con `UserMock` → ahora usa un
    document-like stub con `toObject()` y verifica que el origen no se muta.
- Cobertura de AC: **AC1-AC5 verificadas por e2e** (4/4 ACs del spec
  `permissions-resolution.e2e-spec.ts` — incluye AC3: cambio de permisos de rol
  reflejado sin restart). Gate `test:e2e` completo: **14 suites / 153 tests, 0 fallos**
  (Docker engine activo, `docker compose up -d db-user redis` + `mongo-init`).
- Prueba en vivo contra Redis real (server `node dist/main` + Mongo + Redis docker):
  login admin root → `PUT /roles/:id/permissions` → keys
  `cache:rbac:roles:name:viewer` y `cache:user:<viewer-id>` **desaparecen**;
  `cache:rbac:permissions:all` y la cache del admin (rol distinto) quedan intactas.
  Al restaurar el rol, la invalidación vuelve a dispararse. Server real: 0 errores/
  warnings en log.
- Re-demostración completa post-T8 (HTTP real de cero): health 200, register 201,
  activación+role viewer, login 200, profile 200 (JSON correcto), sin token 401
  `UA-SEC-001`, PATCH 200, `GET /roles` 3 roles OK, `PUT /roles/:id/permissions` 200
  → purge total de `cache:rbac:roles:*` + `cache:user:<demo>`; admin intacto.
  Spec e2e `permissions-resolution` re-corrido DESPUÉS del fix de `permission.service`
  (ts-jest, fuente): **4/4 ACs**.

## Bloqueo (RESUELTO)

`npm run test:e2e` no era ejecutable (Mongo/Redis caídos, Docker Desktop engine off).
**Resuelto**: engine de Docker Desktop activo → `docker compose up -d db-user redis` +
`docker compose up mongo-init` (crea `dev_user`/`dev_password`). Gate e2e completo VERDE
(14/14 suites). Pendiente del usuario: decidir si el server demo en `:3000` se frena
antes de `make up`.

## Criterios de aceptación (del issue)

- [x] Usuario con `permissions: []` y rol `user` → `['user:read', 'user:update']`.
- [x] Usuario con permisos explícitos los conserva (unión, dedup).
- [x] Cambio de permisos de un rol se refleja sin reiniciar el servicio.
- [x] `request.user.permissions` poblado en cada request autenticado.
- [x] Test unitario de la resolución + test e2e de `request.user.permissions`.

## Evidencia / rutas

- `src/auth/auth.service.ts:143` — `validateUser` (cache `user:<id>`, sin TTL propio;
  set usa TTL default 300s).
- `src/rbac/services/role.service.ts:194` — `getPermissionsForRole` muerto; caché por
  nombre con TTL 10 min; `updatePermissions` invalida rol (patrón roto).
- `src/rbac/services/role.service.ts:14-18` — constantes de permisos por rol.
- `src/user/service/user.service.ts:28` — `invalidateUserCache`; `update` (116) y
  `updateUser` (207, línea 234) invalidan.
- `src/user/entities/user.entity.ts:35-39` — `role` (enum) + `permissions: string[]`.
- `test/global-setup.js` — siembra roles `admin/user/viewer` + permisos default y
  flushea Redis por corrida. Ojo: `rbac.e2e-spec.ts` muta el rol `user` a
  `['user:read']` (spec debe setear estado propio al inicio para no acoplarse).