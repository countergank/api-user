# COU-261 — Exponer el estado de bloqueo de cuenta en UserDTO

- **Feature**: `cou-261-lock-state-en-userdto`
- **Issue**: https://linear.app/countergank/issue/COU-261/exponer-el-estado-de-bloqueo-de-cuenta-en-userdto
- **Base**: `origin/develop` @ `d65f6f1` — **Rama**: `feature/cou-261-exponer-el-estado-de-bloqueo-de-cuenta-en-userdto`
- **Estado**: **COMMITEADO** en `a7b1bcc` — unit `75/75` suites (`897/897` tests), `tsc --noEmit` 0,
biome limpio en todo lo tocado; el hook del commit volvió a correr la suite completa (897/897). El
e2e del AC está escrito y tipado pero **no se pudo ejecutar en local** (sin MongoDB ni Redis); se
estrena en CI, igual que COU-304. Sin push ni PR todavía.

## Specs

Citas verbatim del ticket. No se agrega nada que el ticket no pida.

- **S1** — “Agregar `lockedUntil` y `failedLoginAttempts` a `UserDTO`, como campos de solo lectura.”
- **S2** — “Exponerlos únicamente en respuestas de administración.”
- **S3** — “`GET /admin/users` y `GET /admin/users/:id` exponen `lockedUntil` y `failedLoginAttempts`.”
- **S4** — “Esos campos **no** aparecen en respuestas self (`GET /users/profile`) ni en respuestas públicas.”
- **S5** — “Swagger actualizado.”
- **S6** — “Test e2e con una cuenta efectivamente bloqueada.”
- **S7** — “**Fuera de alcance**: permitir modificar esos campos desde el cliente (el desbloqueo se
  hace con `PATCH /admin/users/:id/unlock`).”

## Diseño

- `UserDTO` (`src/user/dto/user.dto.ts`) toma `lockedUntil` y `failedLoginAttempts` de la entidad
  (`src/user/entities/user.entity.ts:117,120`). `lockedUntil` se normaliza a `null` cuando la
  entidad no lo tiene (el `@Prop` usa `default: undefined`, así que en Mongo la clave puede faltar);
  `failedLoginAttempts` cae a `0` por el mismo motivo.
- S2 se cumple **por estructura**, no por filtrado: `UserDTO` sólo lo construye
  `UserController` (`@Controller('admin/users')`, `src/user/controller/user.controller.ts`).
  `GET /users/profile` devuelve su propio objeto `{ name, lastName, email }`
  (`user-profile.controller.ts:41`) y el alta responde `CreateUserResponseDTO`, que también tiene
  forma propia. Se fija con tests en vez de agregar lógica de exclusión que no hace falta.
- S5: `UserResponse` de `src/user/api-docs/examples/user.examples.ts` es el modelo de ejemplo que
  los decoradores de admin declaran con `ApiExtraModels`; se actualiza junto con el DTO para que
  Swagger no muestre un ejemplo desactualizado.
- S7: `CreateUserDTO`/`UpdateUserDTO` no tocan estos campos; el `ValidationPipe` con `whitelist`
  ya descarta propiedades desconocidas del body.

## Tasks

| ID | Tarea | Specs | Ruta | Commit |
|----|-------|-------|------|--------|
| T1 | RED/GREEN: `lockedUntil` y `failedLoginAttempts` en `UserDTO` + unit spec | S1, S2 | inline (parent) | `a7b1bcc` |
| T2 | Swagger: campos y ejemplo de `UserResponse` | S5 | inline (parent) | `a7b1bcc` |
| T3 | e2e: cuenta bloqueada visible en admin y ausente en self/público | S3, S4, S6, S7 | inline (parent) | `a7b1bcc` |
| T4 | Verificación: unit, typecheck, lint | todas | inline (parent) | `a7b1bcc` |

Sin push ni PR: son decisiones del humano. El commit fue autorizado explícitamente para ese comando
(`GIT_COMMIT_APPROVED=1` sólo en esa invocación) y el hook corrió `npm test` antes de dejarlo pasar.

## Log

- **L1** (usuario, verbatim): “usa la skill kickoff”.
- **L2** (usuario, selección en UI): “COU-261 — Exponer estado de bloqueo en UserDTO (recomendado)”.
- **L3** (usuario, selección en UI): estimate “2 puntos”.
- **L4** (usuario, verbatim): “LO VEO BIEN EN GENERAL sigamos”. Revisión del resumen favorable;
  pide continuar.
- **L5** (usuario, selección en UI): “No commitees todavía” ante el commit
  `feat(user): exponer el estado de bloqueo de cuenta en UserDTO (COU-261)`. El commit sigue
  pendiente de autorización explícita; no hay push ni PR.
- **L6** (usuario, verbatim): “vamos con commit” — autoriza el commit exacto
  `feat(user): exponer el estado de bloqueo de cuenta en UserDTO (COU-261)`.
- **Commit (observado)**: `a7b1bcc` — 5 archivos, 411 inserciones(+), 1 deleción(-). El hook
  `.husky/pre-commit` corrió la suite completa: `75/75` suites, `897/897` tests PASS, exit 0.
- **Clasificación**: Task Size = **small** — el outcome y la superficie están claros, no hay decisión
  de producto abierta, el riesgo está contenido (no hay migración, ni cambio de contrato consumido:
  sólo se agregan dos campos a un DTO de admin) y el trabajo se reanuda con el diff.
- **RDD**: `assess` → `nativeRisk: unassessable` (los archivos nuevos sin declarar como intended-
  untracked). Plan resultante: `writerSelfVerification: true`, `independentVerifier: false` —
  coincide con `Risk: none`, sin ítem de alto riesgo que escalar.
- **Bootstrap (observado)**: proyecto Linear `api-user`; ticket con `project`, `estimate=2`,
  `assignee` y `branchName` completos; estado movido a **In Progress**; rama creada con
  `--no-track` sobre `origin/develop` (`d65f6f1`), árbol limpio.
- **Entorno**: Docker Desktop no está corriendo en este WSL y no hay Mongo (27017) ni Redis (6379)
  escuchando. `npm run test:e2e` no puede ejecutarse en local; es el mismo límite que registró
  COU-304 (“el e2e se estrena en CI”).

## Verificación (observada)

- **RED**: `src/user/dto/user.dto.spec.ts` falla con `TS2339: Property 'failedLoginAttempts' does
  not exist on type 'UserDTO'` antes del cambio.
- **GREEN**: `npx jest --testPathPattern='src/user/dto/user.dto.spec.ts'` → 3/3 PASS.
- **Suite unit completa**: `npm run test:unit` → **75 suites / 897 tests PASS**.
- **Tipos**: `npx tsc --noEmit --incremental false` → exit 0 (incluye `test/`, porque el tsconfig
  no restringe `include`).
- **Lint**: `npx biome lint --diagnostic-level=error` limpio en los 4 archivos tocados. Los 29
  errores que reporta `npm run lint` están **preexistentes** y en archivos ajenos a este cambio
  (`all-exceptions.filter.ts`, `logger-config.spec.ts`, `transaction.ts`, entre otros).
- **e2e**: `npx jest --config ./test/jest-e2e.json --testPathPattern='admin-user-lock-state'`
  aborta en `globalSetup` con `MongoServerSelectionError: Server selection timed out after 10000
  ms` y `[ioredis] connect ETIMEDOUT`. Bloqueante de entorno, no del test.

### Cobertura por spec

| Spec | Evidencia |
|------|-----------|
| S1 | unit spec (3 casos: cuenta bloqueada, `null`/`0`, campos previos intactos) |
| S2 | `UserDTO` sólo lo construye `UserController` (`admin/users`); e2e de S4 lo fija |
| S3 | e2e: `GET /admin/users/:id`, envelope paginado y envelope por defecto |
| S4 | e2e: `GET /users/profile` y body de `POST /auth/register` sin los campos |
| S5 | `UserResponse` de `user.examples.ts` (modelo de los 4 decoradores de admin) + `@ApiProperty` en el DTO |
| S6 | e2e: la cuenta se bloquea con 5 intentos fallidos y el 6.º responde `423 UA-AUTH-003` |
| S7 | e2e: `PATCH /admin/users/:id` con `lockedUntil` en el body → `400` (`whitelist` + `forbidNonWhitelisted`) y el estado no cambia |

## Decisiones y hallazgos

- **Hallazgo (no corregido, fuera de alcance)**: la rama “backward compat” que devuelve el array
  plano en `GET /admin/users` es **inalcanzable por HTTP**: el `ValidationPipe` instancia
  `PaginationQueryDTO` y aplica su default `page = 1`, así que la condición `query.page === undefined`
  nunca se cumple. Lo prueba `test/e2e/user/admin-crud-pagination.e2e-spec.ts:309` (espera envelope
  al pedir `GET /admin/users` sin query). Es exactamente el problema que ataca COU-260; el e2e de
  este ticket se ajustó a la realidad observable y no se cambió el controller.
- **Corrección durante la escritura del e2e**: el body de un `DomainError` trae el código `UA-AUTH-003`
  (`ErrorResponseDto.fromDomainError` usa `error.code`), no el `kind` `ACCOUNT_LOCKED`.
- **`lockedUntil` se normaliza a `null`**: el `@Prop` usa `default: undefined`, así que la clave
  puede faltar en el documento; `?? null` la vuelve explícita. `failedLoginAttempts` cae a `0`.
- **Coherencia de cache**: el bloqueo se escribe por `userService.update`, que ya llama a
  `invalidateUserCache`, así que la lectura de admin no sirve estado stale.
- **Tipo `Date | null` en el DTO**: en JSON sale ISO-8601, que es lo que documentan `format:
  'date-time'` y lo que afirma el e2e. Es el mismo tratamiento laxo que ya tienen `createdAt` y
  `updatedAt` en este DTO.
