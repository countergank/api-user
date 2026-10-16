# COU-267 — Exponer el rol y los permisos efectivos del usuario autenticado

- **Feature**: `cou-267-auth-me`
- **Issue**: https://linear.app/countergank/issue/COU-267/exponer-el-rol-y-los-permisos-efectivos-del-usuario-autenticado
- **Base**: `origin/develop` @ `67e0022` — **Rama**: `feat/cou-267-auth-me`
- **Estado**: IMPLEMENTADO, VERIFICADO Y **REVIEW APROBADO** — ronda 2 del review nativo cerrada en
  `approved` y autoridad quemada (`review-1286145d5e3d8e66`); 0 blockers, 0 correcciones. Pendiente
  commit/PR con autorización.

## Objetivo

Endpooint `GET /auth/me` que devuelva `{ id, name, lastName, email, role, permissions[] }`
del usuario autenticado, con los permisos **efectivos** ya resueltos por COU-265 (A6).

Hoy el cliente no puede saber qué mostrar: el JWT es `{ sub, email, role }`
(`src/auth/auth.service.ts:16`) y `GET /users/profile` devuelve solo
`{ name, lastName, email }` (`src/user/controller/user-profile.controller.ts:50-54`).
Es el bloqueante frontal del modelo de permisos para el dashboard.

## Criterios de aceptación (del issue)

- [x] `GET /auth/me` devuelve rol y permisos efectivos del usuario autenticado.
- [x] No expone hash de contraseña, tokens ni campos internos.
- [x] Swagger documentado.
- [x] Test e2e para `admin` (`*`), `user` y `viewer`.

## Scope (autorizado)

1. `GET /auth/me` en `AuthController` protegido con `JwtAuthGuard`.
2. DTO de respuesta con **whitelist explícita** de campos.
3. Swagger: factory `ApplyMeDoc()` en `src/auth/api-docs/`.
4. Unit (DTO + controller) y e2e (`admin`/`user`/`viewer` + caso de error 401).

**Fuera de alcance** (explícito en el issue): incluir permisos dentro del JWT (el token
se mantiene liviano y el cliente consulta `me`). Además, guardrails vigentes: NO tocar
`src/auth/dto/register-user.dto.ts` ni `authService.register()`, NO tocar módulos
ajenos, NO tocar `GET /users/profile`.

## Decisiones de diseño (parent)

- **Fuente de los permisos**: `request.user.permissions`, que ya resolvió COU-265 en
  `AuthService.withEffectivePermissions` (`src/auth/auth.service.ts:164-168`) y montó
  `JwtStrategy.validate` (`src/auth/strategies/jwt.strategy.ts:20-26`). El endpoint NO
  re-resuelve: es exactamente la misma fuente que ya lee `PermissionGuard` (COU-266), así
  que lo que el cliente renderiza coincide con lo que el servidor autoriza. Cero queries
  extra.
- **Whitelist, no spread**: `request.user` lleva TODOS los campos del documento
  (`toPlainUser` → `toObject()`, `src/auth/auth.service.ts:176-179`), incluidos
  `resetPasswordToken`, `emailVerificationToken`, `pendingEmailToken`,
  `failedLoginAttempts`, `lockedUntil`, `deletedAt`, `_id` y timestamps. El DTO copia
  campo por campo; nunca se hace spread ni se devuelve el objeto de request. `password`
  ya está excluido por `select: false` (`src/user/entities/user.entity.ts:31-33`) pero no
  se depende de eso.
- **Forma de respuesta**: exactamente la del issue — `{ id, name, lastName, email, role,
  permissions[] }`. Sin `userName`, sin `isActive`, sin timestamps: agregar campos no
  pedidos amplía la superficie de exposición y el issue es explícito.
- **`id`**: virtual de Mongoose (`Base.id?`, `toObject/toJSON: { virtuals: true }` en
  `src/user/entities/user.entity.ts:11-17`). Sobrevive el camino de caché porque
  `CacheService.set` serializa con `JSON.stringify` (`src/config/cache/cache.service.ts:72`),
  que dispara `toJSON` del documento → el objeto cacheado incluye `id`.
- **Guard**: solo `JwtAuthGuard`. Cualquier usuario autenticado puede leer su propio
  `me`; no hay permiso aplicable, así que NO se usa `@RequirePermissions` ni `@Roles`.
  Sin token o token inválido → 401 `UA-SEC-001`
  (`src/auth/guards/jwt-auth.guard.ts:16-19`).
- **Sin `@AuditAction`**: no es una mutación (el `AuditInterceptor` HTTP ya registra el
  request). El DoD pide `@AuditAction` en cada mutación.
- **i18n**: el endpoint devuelve datos, no mensajes → no se agregan claves `es/en/pt`.
  Mismo criterio que `GET /users/profile`. Si en el futuro devuelve un mensaje, se
  agrega bajo `messages.*` en los tres idiomas.
- **Base de la rama**: `develop`, igual que COU-265/COU-266. La rama `feat/epic-blockers`
  mencionada en el plan del epic no existe en este repo (verificado local y remoto), y
  `develop` ya contiene COU-265 (squash de #417), que es la única dependencia de este
  ticket.

## DoD aplicable

La definición `DB1-DB5` no está escrita en el repo (se buscó en `odd/`, `docs/`,
`.atl/`, `openspec/`); se aplica la que venimos usando para el epic:

- DB1 — unit + e2e verdes, **incluido el caso de error**.
- DB2 — Swagger en cada endpoint tocado.
- DB3 — i18n `es`/`en`/`pt` para mensajes de usuario (acá no hay mensajes; ver arriba).
- DB4 — `@AuditAction` en cada mutación (acá no hay mutación; ver arriba).
- DB5 — sin `any` nuevos, sin `console.log`.

## Checklist

- [x] **T1 — DTO + endpoint + Swagger + unit (RED→GREEN)** ✅
      `src/auth/dto/me-response.dto.ts` (nuevo, con `static of()` como `UserDTO`) +
      `.spec.ts`, handler `@Get('me')` en `src/auth/auth.controller.ts`, factory
      `ApplyMeDoc()` en `src/auth/api-docs/auth.decorator.ts`, y describe nuevo en
      `src/auth/auth.controller.spec.ts`.
- [x] **T2 — e2e** ✅ `test/e2e/auth/auth-me.e2e-spec.ts` con `admin` (`*`), `user` y
      `viewer`, whitelist exacta de 6 claves y el caso de error (401 sin token y 401 con
      token inválido `UA-SEC-001`). El helper `test/helpers/seed-rbac-users.ts` que
      mencionaba el brief **no existe en el repo**: se sembró con `seedAdminForE2E(app)`
      + `UserService.createWithRole()` + login.
- [x] **T3 — Verificación y cierre** ✅ `tsc` exit 0, biome limpio en el archivo tocado,
      suite unit completa verde, e2e verde (dos corridas seguidas), Swagger revisado y
      este documento actualizado. Review nativo ejecutado: ver `Review nativo` abajo.

### Ruta elegida por tarea (declaración de ruta)

| Tarea | Ruta | Evidencia del disparador |
|-------|------|--------------------------|
| T1 | delegado (writer) | 5 archivos no triviales (DTO nuevo, controller, decorator, index, spec) → writer trigger |
| T2 | delegado (writer, mismo hilo) | e2e nuevo + helpers compartidos; evita parar el hilo del writer |
| T3 | inline (parent) | verificación y bookkeeping del orquestador |

La exploración previa (auth + RBAC + e2e harness + convenciones de DTO/Swagger) se
delegó a un explorer read-only: excede el presupuesto inline (>5 lookups secuenciales).

## Verificación (comandos exactos)

```bash
# unit (focalizado, durante el desarrollo)
npx jest src/auth/dto/me-response.dto.spec.ts src/auth/auth.controller.spec.ts --forceExit --detectOpenHandles
# e2e (requiere mongo+redis del compose)
npm run test:e2e -- test/e2e/auth/auth-me.e2e-spec.ts
# typecheck (evita el bug de EACCES en dist/ con incremental)
npx tsc --noEmit --incremental false
# lint/format solo de los archivos tocados (el repo ya está rojo a nivel global en HEAD)
npx biome check <archivos tocados>
```

## Entrega

- Estrategia: **single-pr** para este ticket (un PR contra `develop`), dentro del modelo
  de la cadena COU-260..COU-269.
- Pronóstico de líneas autoradas (adición + borrado, sin generados): ~230–280.
- Real: **~416 líneas autoradas** (288 en los 3 archivos nuevos + 127/1 en los 3
  trackeados). Supera el pronóstico pero es la unidad coherente mínima: endpoint + DTO +
  Swagger + unit + e2e con sus casos de error, sin nada accesorio.
- Commits de work unit previstos: T1 (código + tests unit + Swagger) y T2 (e2e).
- Normas: PR en español, commits Conventional Commits en inglés, sin atribución de IA.
- **Ningún commit/push/PR sin autorización explícita del usuario (acción por acción).**

## Progreso y evidencia

- [x] Preflight: issue de Linear leído; base `origin/develop` @ `67e0022`; rama
      `feat/cou-267-auth-me` creada; tree limpio.
- [x] Exploración del surface (auth/RBAC/e2e/DTO/Swagger) — delegada a explorer read-only.
- [x] T1, T2, T3 — archivos entregados:
      `src/auth/dto/me-response.dto.ts` (nuevo), `src/auth/dto/me-response.dto.spec.ts`
      (nuevo), `test/e2e/auth/auth-me.e2e-spec.ts` (nuevo), `src/auth/auth.controller.ts`,
      `src/auth/auth.controller.spec.ts`, `src/auth/api-docs/auth.decorator.ts`.

### Evidencia de verificación (observada por el orquestador)

| Check | Comando | Resultado |
|-------|---------|-----------|
| unit focalizado | `npx jest src/auth/dto/me-response.dto.spec.ts src/auth/auth.controller.spec.ts --forceExit --detectOpenHandles` | 2 suites / 15 tests PASS |
| unit completo | `npm test` | 68 suites / 738 tests PASS |
| e2e | `npm run test:e2e -- test/e2e/auth/auth-me.e2e-spec.ts` | 6/6 PASS (corrido 2× seguidas, idempotente) |
| tipos | `npx tsc --noEmit --incremental false` | exit 0 |
| lint | `npx biome check test/e2e/auth/auth-me.e2e-spec.ts` | sin errores |

Nota (738 vs 754 de COU-266): la diferencia es de base, no del cambio — `develop` no
incluye los tests de la rama COU-266, y `git diff --stat` no muestra borrados.

Biome: `auth.controller.ts`, `auth.controller.spec.ts` y `auth.decorator.ts` **ya fallan**
en `HEAD` (organizeImports/format preexistentes en líneas no tocadas; verificado con
`git show HEAD:<file> | npx biome check --stdin-file-path=<file>`). No se corrigieron
(precedente COU-266: diff enfocado). El único error nuevo (organizeImports del e2e) se
corrigió.

### Review nativo (receipt-driven development)

- Lineage `review-14e885e6368e2acf`; revision `sha256:e0e18e96…`; target `sha256:db9a2dfd…`;
  tier **high**; 6 archivos; 424 líneas congeladas; `correction_budget: 200`.
- Consentimiento: `granted` (elección del usuario). Los 4 lentes corrieron
  (`readability` fue rechazado una vez por el transporte — `output_refused` — y admitido
  en el relanzamiento sobre el mismo slot).
- Cierre: **`escalated`** (`unknown_causality`) → `manual_action_required`. Resultado
  informacional, **sin recibo de aprobación**. 16 findings: 2 CRITICAL, 8 WARNING,
  6 SUGGESTION.
- Verificación de los dos CRITICAL por parte del orquestador:
  - **R4-001** ("`/auth/me` no tiene rate limiting explícito pese a documentar 429") →
    **refutado como defecto de este ticket**. `DynamicThrottlerGuard` está registrado como
    `APP_GUARD` global (`src/app/app.module.ts:38-41`) y `/auth/me` cae en el bucket
      `global` (`src/config/throttle/dynamic-throttler.guard.ts:68-85`); documentar 429 es
      la convención preexistente (6 decoradores de `auth.decorator.ts` y ningún `@Throttle`
      en `auth.controller.ts`).
- **Hallazgo derivado (preexistente, repo-wide, fuera de scope):** en
  `@nestjs/throttler@5` el `ttl` está en **milisegundos** (README:391) y el repo lo
  configura en `60` (`src/app/app.module.ts` y `THROTTLE_TTL`/`LOGIN_THROTTLE_TTL`/… = `60`)
  → la ventana efectiva es de **60 ms**, así que la limitación de tasa es inoperante en la
  práctica para todas las rutas. Evidencia: un burst de 60 requests a `/auth/me` en 814 ms
  nunca devolvió 429; y los tests existentes de rate limiting son permisivos
  (`expect([200, 429]).toContain(...)`, `src/auth/auth.controller.spec.ts:91,99`), o sea que
  hoy **ningún test prueba un 429**. Pertenece al ticket de diseño de Rate Limiting (el
  usuario pidió verlo antes).
- **R3-001** (CRITICAL, `introduced`): el e2e mutaba estado compartido — `pinRole()`
  escribía la colección `roles` con `roleService.updatePermissions()` en `beforeAll`/
  `afterAll` y `test/jest-e2e.json` corre jest e2e **en paralelo** (sin `runInBand` ni
  `maxWorkers=1`). **Corregido**: se eliminó el pinning; el spec ahora solo lee el estado
  que `test/global-setup.js` siembra (idéntico a `ADMIN/USER/VIEWER_PERMISSIONS`) y
  `seedDefaultRoles()` es idempotente. Las aserciones de permisos pasaron a comparación
  independiente del orden (`expectPermissionSet`: igualdad de conjuntos + longitud), lo que
  también resuelve el nit R3-006.
- Descartados con análisis: R3-005 ("`.sort()` enmascara claves") es **falso positivo** —
  comparar ambas listas ordenadas con `toEqual` es igualdad exacta (misma longitud + mismos
  elementos). R4-002/R4-003/R3-003/R3-004 (observabilidad por endpoint, chequeos defensivos
  del DTO, `@CurrentUser()` sin guard) son consistentes con el resto del repo: no hay
  instrumentación por endpoint en ningún lado y `JwtAuthGuard` garantiza `request.user`.
  R2-001/R2-002/R2-003/R2-004 son sugerencias de refactor de setup de tests (estilo del
  repo: cada spec arma su propia app).
- Decisión del maintainer (el usuario): **arreglar el e2e y re-revisar** en una línea nueva
  (la autoridad escalada es terminal; no se reutiliza `review-14e885e6368e2acf`).

### Review nativo — ronda 2 (post-fix)

- Lineage `review-1286145d5e3d8e66`; target `sha256:32dfaf77…` **idéntico** al de la ronda 1 en
  alcance (mismo conjunto de 6 archivos), pero con el e2e ya corregido; tier **high**;
  `correction_budget: 200`. Proyección `workspace`, `base_tree f648c938…`,
  `candidate_tree d47ceced…`, 416 líneas autoradas.
- Consentimiento: `granted` (elección del usuario). Los 4 lentes corrieron: `review-risk`,
  `review-resilience`, `review-readability`, `review-reliability`.
- Cierre: **`approved`** — `envelope gentle-ai.review-acknowledged/v1`, `action: acknowledged`,
  `authority: burned`. **Cero blockers, cero correcciones abiertas** (ningún hallazgo escaló a
  `correction_required`).
- Resultado por lente: `risk` 0 findings · `resilience` 0 findings · `readability` 1 SUGGESTION;
  `reliability` 1 WARNING + 2 SUGGESTION.
- **El CRITICAL de la ronda 1 (R4-001, rate limiting) no reapareció**: los lentes de riesgo y
  resiliencia devolvieron **cero** findings. La refutación documentada arriba se sostuvo sin
  intervención adicional.
- Hallazgos no bloqueantes (informacionales por contrato del envelope — van como trabajo
  posterior, **sin** re-correr el review de este candidato):
  - **R3-001** (WARNING, `test/e2e/auth/auth-me.e2e-spec.ts`): el `beforeAll` crea admin + 2
    usuarios de rol con emails derivados de `Date.now()` y el `afterAll` no los elimina → quedan
    filas residuales en la DB de test. Es limpieza de fixtures, no estado compartido mutado
    (la clase que se corrigió en la ronda 1).
  - **R2-001** (SUGGESTION): el spec del DTO duplica el fixture de 19 campos y las aserciones
    del controller spec; el contrato de whitelist queda re-afirmado en 3 módulos en vez de una
    fixture compartida.
  - **R3-002** (SUGGESTION): el spec del DTO no cubre el caso `permissions` ausente.
  - **R3-003** (SUGGESTION): el e2e re-asserta el loop de whitelist que los unit tests ya prueban.
- Nota operativa: los agentes lente apuntaban a `opencode/nemotron-3-ultra-free`, que quedó
  caído (timeout del provider; sondas reproducibles con `rc=124` y 0 bytes). Se cambió el `model`
  de los 4 agentes a `opencode/nemotron-3.5-super-vl-free` (free, verificado OK) en
  `~/.config/opencode/opencode.json` (backup `opencode.json.bak-20261016-142732`), con
  autorización del usuario. `review-reliability` fue rechazado una vez por `output_refused` y
  admitido en el relanzamiento sobre el mismo slot.
- Los 6 bytes revisados quedan congelados: cualquier edición de código invalidaría el receipt.
  Los 4 findings no bloqueantes se tratan como trabajo posterior (no re-abren este candidato).
