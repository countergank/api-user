# COU-262 — Corregir los códigos de estado de los endpoints de acción de autenticación

- **Feature**: `cou-262-codigos-estado-acciones-auth`
- **Issue**: https://linear.app/countergank/issue/COU-262/corregir-los-codigos-de-estado-de-los-endpoints-de-accion-de-autenticacion
- **Base**: `origin/develop` @ `1c39d56` — **Rama**: `fix/cou-262-auth-action-status-codes`
- **Estado**: IMPLEMENTADO Y VERIFICADO — commit único en la rama, sin push

## Specs

Criterios de aceptación del ticket, verbatim.

- **S1** — "Los 4 endpoints devuelven 200." Los cuatro son acciones que no crean recursos y
  hoy responden 201 por no declarar `@HttpCode`:
  - `POST /auth/reset-password` — `src/auth/auth.controller.ts:78`
  - `POST /auth/verify-email` — `src/auth/auth.controller.ts:92`
  - `POST /auth/confirm-email-change` — `src/auth/auth.controller.ts:127`
  - `POST /auth/resend-verification` — `src/auth/auth.controller.ts:157`
- **S2** — "`POST /auth/register` sigue devolviendo 201." Es una creación real y queda fuera de
  alcance tocarla.
- **S3** — "Swagger coincide con el comportamiento real." Las factories
  `ApplyResetPasswordDoc`, `ApplyVerifyEmailDoc`, `ApplyConfirmEmailChangeDoc` y
  `ApplyResendVerificationDoc` ya documentan `ApiResponse({ status: 200 })`: la corrección alinea
  el código con lo ya documentado, no al revés.
- **S4** — "Test e2e por endpoint verificando el código de estado."
- **S5** — "Nota de migración para consumidores que hoy esperan 201."

## Tasks

| ID | Spec | Ruta |
|----|------|------|
| T1 | S1, S4 | RED: e2e que exige 200 en los 4 endpoints y 201 en `register` |
| T2 | S1, S2 | GREEN: `@HttpCode(200)` en los 4 handlers de acción |
| T3 | S1 | Alinear las aserciones `201` heredadas en las suites e2e existentes |
| T4 | S3, S5 | Swagger + nota de migración en `CHANGELOG.md` |
| T5 | — | Verificación completa (tsc, biome, unit, e2e) y cierre |

Todas las tareas están cerradas en un único commit de unidad de trabajo sobre
`fix/cou-262-auth-action-status-codes`.

## Verificación

- **RED (T1)** — `npx jest --config ./test/jest-e2e.json --runInBand test/e2e/auth/auth.e2e-spec.ts`
  con las 5 aserciones nuevas en 200: `Tests: 5 failed, 10 passed` y, en cada una,
  `expected 200 "OK", got 201 "Created"`. El `register` en 201 seguía verde: S2 no estaba roto.
- **GREEN (T2)** — la misma suite: `Tests: 15 passed, 15 total`.
- **e2e completo (T3 + suite entera)** — `npm run test:e2e -- --runInBand`: **21 suites, 259 tests,
  exit 0**. Los 201 que quedan en `test/` son `register`, creación de roles/parámetros/plantillas y
  `POST /admin/users`, ninguno de los cuatro endpoints de S1.
- **`tsc --noEmit`** — exit 0. Se corre con `--incremental false` porque `dist/` pertenece a root
  (artefacto de Docker) y el `--noEmit` con incremental falla al escribir el `.tsbuildinfo`.
- **`biome lint ./src`** — 29 errores **preexistentes** en archivos que este cambio no toca; los dos
  archivos tocados (`src/auth/auth.controller.ts`, `test/e2e/auth/auth.e2e-spec.ts`) lintan limpios.
  `./test` no lo lintea el script del repo (`lint` solo apunta a `./src`).
- **unit** — `npm run test:unit`: **74 suites, 894 tests, exit 0**.

## Review nativo

`gentle_review assess` (RDD on) devolvió `nativeRisk: unassessable` por un motivo mecánico: el
candidato incluye un archivo sin trackear (`odd/tasks/cou-262-codigos-estado-acciones-auth.md`)
y el contrato nativo exige declararlo explícitamente. Plan resultante: `writerSelfVerification: true`, `independentVerifier: false` —
ningún ítem de alto riesgo de Task Size fue escalado, y la verificación del writer ya está hecha
(unit + e2e + tsc + lint de los archivos tocados). No se inició lineage: no hay `reviewDue` real
ni pedido explícito de review.


## Log

- **L1** — Pedido del usuario, verbatim: "Usa la skill kickoff del repo"
- **L2** — Ticket elegido por el usuario entre los 11 abiertos del proyecto Linear `api-user`:
  `COU-262`. Recomendación del orquestador: scope cerrado, chico, sin decisiones de producto
  abiertas; el código sigue vigente (verificado en `src/auth/auth.controller.ts`).
- **L3** — Exploración previa al tracking: de los 11 tickets abiertos, `COU-260` y `COU-261`
  también están bien especificados, pero `COU-260` cambia contratos que el cliente ya consume y
  exige decidir antes el plan de deprecación del array plano.
- **L4** — Hallazgo que amplía el alcance real: 14 aserciones `.expect(201)` en 13 archivos de
  `test/e2e/` dependían del comportamiento actual (varias en el setup de `verify-email` de otras
  suites). S1 las invalida, así que T3 entró en el scope. Lo que **no** entra: las líneas que
  esperan 201 por `POST /auth/register` (S2).
- **L5** — Conteo final de T3: **15** aserciones en **12** archivos, no 14/13; el script de barrido
  encontró una más en el setup de otra suite. Ninguna aserción de `register` se tocó.
- **L6** — El usuario aprobó mover `COU-262` a **In Progress** en Linear al iniciar el trabajo
  (quedó en `Backlog` durante el bootstrap porque ni `kickoff` ni `linear-tickets` especifican
  transiciones de estado; verificado con `grep` sobre ambos skills, 0 coincidencias). El usuario
  decidió **no** agregar esa regla a la skill.
- **L7** — Pregunta del usuario, verbatim: "porque hicimos esto exactamente? no lo maneja el
  decorador customizado del endpoint en cada caso?" Respuesta y decisión de diseño: las factories
  `Apply*Doc()` sólo aplican metadata OpenAPI (`ApiResponse`, `ApiBody`, `ApiOperation`, ejemplos);
  `@ApiResponse({ status: 200 })` **no** cambia el status de la respuesta, sólo el documento
  Swagger. NestJS responde `201` por defecto a todo `@Post` sin `@HttpCode`. La prueba empírica es
  el RED de T1: esas cuatro factories ya declaraban `ApiResponse({ status: 200 })` y los endpoints
  seguían devolviendo `201`. `applyDecorators` sí podría componer `HttpCode(200)` dentro de la
  factory, pero se descartó: los 10 factories del repo no aplican ni un decorador de runtime
  (`grep`: 0), el status quedaría escondido en `api-docs/` en vez de junto a la ruta, y quitar o
  reemplazar un decorador de documentación cambiaría el contrato en silencio. Se siguió la
  convención existente: 13 de los 21 handlers `@Post` de `src/` ya declaran `@HttpCode` al lado de
  la ruta. Costo aceptado: el `200` vive dos veces (doc + handler) y ningún test compara el status
  documentado contra el real; el e2e pinnea el real.
