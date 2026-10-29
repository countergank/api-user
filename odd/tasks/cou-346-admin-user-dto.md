# COU-346 — Separar los campos de bloqueo en un DTO de administración

- **Feature**: `cou-346-admin-user-dto`
- **Issue**: https://linear.app/countergank/issue/COU-346/separar-los-campos-de-bloqueo-en-un-dto-de-administracion
- **Base**: `origin/develop` @ `c6d5f17` — **Rama**: `feature/cou-346-separar-los-campos-de-bloqueo-en-un-dto-de-administracion`
- **Estado**: EN IMPLEMENTACIÓN
- **Decisión que implementa**: COU-322 (opción a), mergeada en `develop`

## Specs

Criterios de aceptación del ticket, citados verbatim.

- **S1** — “`UserDTO` no expone `lockedUntil` ni `failedLoginAttempts`; `AdminUserDTO` sí, con su metadata de Swagger.”
- **S2** — “Los cuatro handlers de admin y `findPaginated` devuelven `AdminUserDTO`; un handler no-admin que intente devolver los campos de bloqueo **no compila**.”
- **S3** — “La respuesta HTTP no cambia: los e2e de lock state siguen verdes, incluidos los casos de ausencia en `/users/profile` y `/auth/register`.”
- **S4** — “El schema de Swagger del admin sigue documentando las mismas 11 propiedades, con `lockedUntil` nullable y `format: date-time`.”
- **S5** — “`npm test`, `npm run test:e2e` y `tsc` limpios.”
- **S6** (scope fuera) — “cambiar los endpoints, la forma de la respuesta HTTP, la lógica de lockout o la entidad.”

## Contexto

Hoy el límite es convención: `UserDTO` incluye los campos de bloqueo y es seguro sólo porque el único
controller que lo construye es el de admin (`src/user/controller/user.controller.ts:44-48`,
`@Roles(UserRole.ADMIN)`). Nada lo impide por tipo.

## Diseño

- **`src/user/dto/admin-user.dto.ts`** (nuevo): `AdminUserDTO extends UserDTO` que agrega
  `lockedUntil` (`string | null`, con su `@ApiProperty` nullable + `format: date-time`) y
  `failedLoginAttempts` (`number`), con su propio `of()`. El constructor llama a `super(user)` y luego
  mapea los dos campos; `lockedUntil` se serializa con `toISOString()` igual que hoy.
- **`src/user/dto/user.dto.ts`**: pierde los dos campos y sus líneas de mapeo. Nada más.
- **`src/user/controller/user.controller.ts`** (`findAll`, `findById`, `update`, `toggleActive`) y
  **`src/user/service/user.service.ts`** (`findPaginated`): retipean a `AdminUserDTO`.
- **`src/user/api-docs/examples/user.examples.ts`**: `UserResponse` pasa a extender `AdminUserDTO`. Si
  derivara de `UserDTO`, el Swagger del admin perdería justo los dos campos (eso es lo que COU-319
  dejó listo y lo que COU-322 advirtió).
- **Sin cambios** en endpoints, forma de la respuesta, lógica de lockout ni entidad (S6).

## Verificación

- **S1/S2 (tipos, en tiempo de compilación)**: en el spec del DTO, un `// @ts-expect-error` sobre el
  acceso a `userDTO.lockedUntil` y `userDTO.failedLoginAttempts`. Si alguien vuelve a agregarlos al
  DTO base, `tsc` falla: la garantía se prueba, no se documenta.
- **S1/S4 (comportamiento y Swagger)**: `AdminUserDTO.of(user)` expone `lockedUntil` como ISO y
  `failedLoginAttempts` numérico (incluido el caso `null`/`0`), y el e2e de schema
  (`test/e2e/user/swagger-user-response.e2e-spec.ts`, reapuntado) sigue afirmando las 11 propiedades
  con `nullable` y `format: date-time`.
- **S3 (contrato HTTP intacto)**: los e2e de `test/e2e/user/admin-user-lock-state.e2e-spec.ts` sin
  tocar, incluidos los casos de ausencia en `/users/profile` y `/auth/register`.

## Tasks

| ID | Tarea | Specs | Ruta | Commit |
|----|-------|-------|------|--------|
| T1 | RED: `@ts-expect-error` sobre los campos en `UserDTO` (hoy compila, porque existen) | S1, S2 | `src/user/dto/user.dto.spec.ts` | — |
| T2 | GREEN: `AdminUserDTO` nuevo y `UserDTO` sin los campos | S1 | `src/user/dto/` | — |
| T3 | Retipear controller y service a `AdminUserDTO` | S2 | controller + service | — |
| T4 | `UserResponse` deriva de `AdminUserDTO`; e2e de schema reapuntado | S4 | `user.examples.ts`, spec de schema | — |
| T5 | Verificación completa: unit, e2e, tsc, biome | S3, S5 | inline | — |

## Log

- **L1** (usuario, verbatim): “Perfecto ya mergee, vamos con el resto y sumamos el tticket el dto que dijiste”.
- **L2** (readiness COU-346): proyecto `api-user`, estimate `3`, asignado `Leandro Javier Cepeda`,
  labels `api` + `type:chore`, `branchName` =
  `feature/cou-346-separar-los-campos-de-bloqueo-en-un-dto-de-administracion`. Movido a `In Progress`;
  rama creada con `--no-track` desde `origin/develop` @ `c6d5f17`.
- **L3** (decisión, parent): se hace antes que COU-153 porque el plan ya está escrito y el riesgo está
  acotado; COU-153 (High) queda como siguiente, pero necesita estimación previa por ser una feature.
- **L4** (decisión, parent): la garantía estructural se prueba con `@ts-expect-error`, no con un
  comentario. Un test que afirme “esto no debe compilar” es lo único que detecta una regresión del
  límite cuando alguien vuelva a agregar el campo al DTO base.
- **Clasificación**: Task Size = **medium** — ~10 archivos, casi todo retipeo; el riesgo real es
  olvidar el retargeting de `UserResponse` y romper el schema de Swagger.
