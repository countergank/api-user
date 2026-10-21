# COU-261 — Exponer el estado de bloqueo de cuenta en UserDTO

- **Feature**: `cou-261-lock-state-en-userdto`
- **Issue**: https://linear.app/countergank/issue/COU-261/exponer-el-estado-de-bloqueo-de-cuenta-en-userdto
- **Base**: `origin/develop` @ `d65f6f1` — **Rama**: `feature/cou-261-exponer-el-estado-de-bloqueo-de-cuenta-en-userdto`
- **Estado**: **EN PR** → https://github.com/countergank/api-user/pull/431 (rama
`feature/cou-261-exponer-el-estado-de-bloqueo-de-cuenta-en-userdto`, base `develop`). Commits
`a7b1bcc` (feature) y `72d67ac` (registro ODD); el e2e se estrenó en CI y **falló**, corregido en
el commit de `test(user)`. Unit `75/75` suites (`897/897` tests), `tsc --noEmit` 0, biome limpio.

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

| T5 | Corregir el setup del e2e tras la primera corrida de CI | S6 | inline (parent) | `test(user)` |

PR #431 abierto por autorización explícita del humano. Cada commit fue autorizado para ese comando
(`GIT_COMMIT_APPROVED=1` sólo en esa invocación) y los hooks corrieron `npm test`/la suite antes de
dejar pasar el commit y el push. El merge sigue siendo decisión del humano.

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
- **Corrección por CI (primera corrida del PR #431)**: el e2e falló entero en `beforeAll` con
  `expected 423 "Locked", got 200 "OK"`. Causa: `.github/workflows/test.yml:109` define
  `MAX_LOGIN_ATTEMPTS: '100'` (y `LOCKOUT_DURATION_MINUTES: '1'`) para que las suites no se bloqueen
  entre sí, así que el ritual de cinco intentos fallidos no bloquea nada en CI. Se cambió el setup:
  el estado se siembra con `findByIdAndUpdate` y el bloqueo se prueba con el síntoma que ve el
  cliente (`423 UA-AUTH-003`). Sigue siendo una cuenta efectivamente bloqueada — lo que se verifica
  es que la aplicación la trata como tal — y deja de depender de un umbral configurable.
  Resto de la corrida: 21 suites y 259 tests en verde; sólo falló la suite nueva.
- **RDD / review nativo**: `assess` → `nativeRisk: unassessable` (archivos nuevos sin declarar como
  intended-untracked). Luego, con el candidato ya commiteado, `inspect` → `start` y la lineage
  `review-91d847c0be0ef48b` quedó en `collect` con lentes `risk`, `readability`, `reliability`.
  Esa lineage apunta al target `sha256:8e2bdda…` de los dos primeros commits: al corregir el e2e el
  target cambia y la review se reabre sobre el candidato corregido.
- **L9** (usuario, selección en UI): “Crear tickets de seguimiento para los 4 reales”. Se dieron de alta
  con el estándar de `linear-tickets` (proyecto `api-user`, estimación, asignado, tipo + componente):
  **COU-319** `chore+docs` est. 1 (R2-001, derivar `UserResponse` de `UserDTO`), **COU-320**
  `chore+api` est. 1 (R2-003, fixture sin doble cast), **COU-321** `chore+api` est. 2
  (R3-dto-date-type-drift), **COU-322** `spike+api` est. 1 (R1, decidir si se separa el DTO de
  administración). `R2-002` no generó ticket: quedó resuelto al registrar los hashes en la tabla, y
  `R3-e2e-seed-cache-bypass` queda cubierto por `auth.service.spec.ts:201`.
- **L8** (evidencia de CI, no del usuario): corridas `39645339018` (pull_request) y `39645332605`
  (push) sobre `6025017` → `conclusion: success`. El e2e corregido pasa en CI: 22 suites, sin fallos.
- **Review nativo del candidato corregido (observado)**: lineage `review-bbcf300733bbb9f0` sobre
  `sha256:36dbc71d…` (tres commits, 440 líneas), lentes `risk`, `readability`, `reliability`, tier
  `medium`. Forecast: 3 model runs por `pi_host_relay`; los tres reviewers se admitieron y el último
  evento **cerró en `approved`**. Acknowledgement ejecutado: `authority: burned`
  (`gentle-ai.review-acknowledged/v1`), delivery por política ordinaria del repo. Sin correcciones
  abiertas: los seis hallazgos son **advisories no bloqueantes** para trabajo posterior —
  `R1-lockstate-scope-by-convention` (risk), `R2-001/002/003` (readability),
  `R3-dto-date-type-drift` y `R3-e2e-seed-cache-bypass` (reliability). Ninguno reabre la review de
  este candidato.
- **L7** (evidencia de CI, no del usuario): corrida `39643176765` del PR #431 → `Test Suites: 1
  failed, 21 passed, 22 total` / `Tests: 7 failed, 259 passed, 266 total`; único archivo fallido
  `test/e2e/user/admin-user-lock-state.e2e-spec.ts`.
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
| S6 | e2e: la cuenta objetivo queda bloqueada y `POST /auth/login` responde `423 UA-AUTH-003` (la
prueba de que el bloqueo está activo la da la aplicación, no el campo) |
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
