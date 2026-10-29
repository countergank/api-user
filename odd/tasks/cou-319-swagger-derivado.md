# COU-319 — Derivar el ejemplo de UserResponse de UserDTO en Swagger

- **Feature**: `cou-319-swagger-derivado`
- **Issue**: https://linear.app/countergank/issue/COU-319/derivar-el-ejemplo-de-userresponse-de-userdto-en-swagger
- **Base**: `origin/develop` @ `61120d8` — **Rama**: `feature/cou-319-derivar-el-ejemplo-de-userresponse-de-userdto-en-swagger`
- **Estado**: EN IMPLEMENTACIÓN

## Specs

Criterios de aceptación y alcance del ticket, citados verbatim.

- **S1** — “Un cambio de descripción o ejemplo en `UserDTO` se refleja en Swagger sin editar `user.examples.ts`.”
- **S2** — “`GET /admin/users`, `GET /admin/users/:id`, `PATCH /admin/users/:id` y el toggle siguen documentando las mismas propiedades que hoy.”
- **S3** (scope incluido) — “que el ejemplo de las respuestas de admin tome la metadata de `UserDTO` en un solo lugar (derivar el modelo o documentar el ejemplo desde él).”
- **S4** (scope fuera) — “cambiar la forma de la respuesta o los endpoints. Las clases `UserListResponse` y `PaginatedUserResponse` quedan como están salvo lo necesario para componer.”

## Contexto

`src/user/api-docs/examples/user.examples.ts` repite a mano los `@ApiProperty` de `UserDTO`. Ya
divergieron en COU-261: para `lockedUntil`, el ejemplo dice *“Fecha en la que la cuenta se desbloquea
sola; null si no está bloqueada”* y el DTO dice *“Fecha y hora en la que la cuenta se desbloquea sola;
null si no está bloqueada. Solo lectura.”* Cada campo nuevo es una copia más para desincronizar.

## Diseño

- **`UserResponse extends UserDTO`** y no redeclara ninguna propiedad: hereda los `@ApiProperty` del
  DTO, así que la metadata de Swagger tiene una sola fuente (S1, S3).
- `UserListResponse` y `PaginatedUserResponse` siguen componiendo con `UserResponse`; no cambian (S4).
- **Nada de endpoints ni de la forma de respuesta** (S4): sólo cambia de dónde sale la metadata.

## Verificación (S1, S2)

Spec e2e nuevo (`test/e2e/user/swagger-user-response.e2e-spec.ts`) que **construye el documento
OpenAPI** con `SwaggerModule.createDocument(app, ...)` sobre la app de test y afirma sobre
`components.schemas.UserResponse`:

1. `lockedUntil.description` es **exactamente** la del `UserDTO`, no la copia corta del ejemplo. Ese
   texto es el que hoy diverge, así que este caso es el **RED**.
2. El conjunto de propiedades es el de hoy: `id`, `name`, `lastName`, `email`, `userName`, `role`,
   `isActive`, `createdAt`, `updatedAt`, `lockedUntil`, `failedLoginAttempts` (S2).
3. `lockedUntil` conserva `format: date-time` y `nullable` (regresión de COU-321).

## Tasks

| ID | Tarea | Specs | Ruta | Commit |
|----|-------|-------|------|--------|
| T1 | RED: spec del documento OpenAPI afirmando la descripción del DTO | S1, S2 | `test/e2e/user/swagger-user-response.e2e-spec.ts` | — |
| T2 | GREEN: `UserResponse extends UserDTO` sin redeclarar campos | S1, S3, S4 | `src/user/api-docs/examples/user.examples.ts` | — |
| T3 | Verificación: spec nuevo, e2e completo, unit, tsc | S1, S2 | inline | — |

## Log

- **L1** (usuario, verbatim): “Perfecto chat quedo todo mergeado, que sigue?”.
- **L2** (readiness COU-319): proyecto `api-user`, estimate `1`, asignado `Leandro Javier Cepeda`,
  `branchName` = `feature/cou-319-derivar-el-ejemplo-de-userresponse-de-userdto-en-swagger`.
  Se retoma desde el `develop` nuevo (`61120d8`) que ya incluye #446, que era el bloqueo registrado
  cuando el ticket se pausó.
- **L3** (decisión, parent): la verificación va contra el **documento OpenAPI generado**, no contra el
  archivo de ejemplos: lo que el ticket pide es que Swagger refleje el DTO, y eso sólo se prueba
  mirando el schema resultante.
- **L4** (decisión, parent): no se tocan los decoradores del controller. `UserResponse` se mantiene
  como tipo de referencia en `getSchemaPath`, así que los endpoints siguen documentando lo mismo (S2)
  sin editar `user.decorator.ts`.
- **Clasificación**: Task Size = **small** — una clase que pasa a extender el DTO y un spec de
  verificación.
