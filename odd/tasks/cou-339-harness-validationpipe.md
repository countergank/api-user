# COU-339 — Alinear el harness de e2e con el ValidationPipe de producción

- **Feature**: `cou-339-harness-validationpipe`
- **Issue**: https://linear.app/countergank/issue/COU-339/alinear-el-harness-de-e2e-con-el-validationpipe-de
- **Base**: `origin/develop` @ `b6ac58e` — **Rama**: `feature/cou-339-alinear-el-harness-de-e2e-con-el-validationpipe-de`
- **Estado**: EN IMPLEMENTACIÓN

## Specs

Criterios de aceptación y alcance del ticket, citados verbatim.

- **S1** — “Un body inválido contra un endpoint con DTO responde `400` con `code: UA-COM-005` **en los e2e**.”
- **S2** — “Los casos de COU-326 (`test/e2e/auth/auth.e2e-spec.ts`) afirman el `code`, no sólo el status.”
- **S3** — “Las aserciones existentes que dependían de `HTTP_400` quedan ajustadas y justificadas.”
- **S4** — “La suite completa pasa sin debilitar ningún caso: no se cambia una expectativa por una más laxa sin explicar por qué.”
- **S5** — “Queda documentado en el README o en el helper por qué el harness replica el bootstrap.”
- **S6** (scope incluido) — “que el harness use el mismo pipe que producción y que las aserciones de error de validación puedan afirmar `UA-COM-005`.”
- **S7** (scope fuera) — “cambiar el pipe de producción, cambiar los códigos de error, o reescribir casos que hoy afirman sólo el status.”

## Contexto

`test/helpers/create-test-app.ts` monta la app con el `ValidationPipe` **stock** de Nest, mientras
`src/main.ts` instala `src/common/pipes/validation.pipe.ts`, cuyo `exceptionFactory` publica
`code: UA-COM-005` + `details`. Con el pipe stock el `AllExceptionsFilter` cae al `code` derivado
`HTTP_400`, así que ningún e2e podía afirmar el contrato real de validación.

Hallazgo adicional durante el relevamiento (no estaba en el ticket, pero S4 lo obliga a resolver):
`test/e2e/password-strength/password-strength.e2e-spec.ts` afirma los códigos de regla
(`PASSWORD_TOO_SHORT`, …) dentro de `body.message`, algo que **sólo** el pipe stock produce, porque
la `defaultMessage()` del validador devuelve los códigos y el pipe stock los propaga tal cual. El
pipe de producción descarta los mensajes de constraint (`Object.keys(e.constraints)`) y publica
`message: 'Validation failed'` + `details: [{ property, constraints: [<nombres de constraint>] }]`.
Esos 10 casos afirman hoy un contrato que producción no emite.

## Diseño

- **`test/helpers/create-test-app.ts`**: importa el `ValidationPipe` de
  `src/common/pipes/validation.pipe` y lo instala igual que `main.ts` (`app.useGlobalPipes(new ValidationPipe())`).
  Sin options duplicadas: la copia de options en el helper era justamente lo que dejaba divergir el contrato.
  Se documenta en el helper (S5) qué se replica (pipe global + `AppModule`, que aporta el
  `AllExceptionsFilter`) y qué no (helmet, compress, cors, logger, puerto real).
- **`test/e2e/auth/auth.e2e-spec.ts`**: los tres casos de validación de `POST /auth/login` (COU-326)
  afirman `400` + `code: UA-COM-005` + `details` con `property` (S1, S2).
- **`test/e2e/user/admin-create-user-permissions.e2e-spec.ts`** y **`test/e2e/rbac/roles-crud.e2e-spec.ts`**:
  los comentarios que justificaban afirmar sólo el status se retiran y los casos pasan a afirmar
  `code: UA-COM-005` (S3).
- **`test/e2e/password-strength/password-strength.e2e-spec.ts`**: los 10 casos pasan de afirmar códigos
  de regla en `body.message` a afirmar el contrato real (`code: UA-COM-005`, `details` con
  `property: 'password'` y la constraint `passwordStrength`). La distinción por regla queda cubierta en
  `src/common/validators/password-strength.validator.spec.ts` y
  `src/user/dto/password-validation.integration.spec.ts`, que es donde hoy ya se afirma cada código (S3, S4).

## Tasks

| ID | Tarea | Specs | Ruta | Commit |
|----|-------|-------|------|--------|
| T1 | RED: casos e2e de login afirmando `code: UA-COM-005` | S1, S2 | `test/e2e/auth/auth.e2e-spec.ts`, `test/helpers/validation-error.ts` | — |
| T2 | GREEN: harness instala el pipe de producción + documentación del helper | S1, S5, S6 | `test/helpers/create-test-app.ts` | — |
| T3 | Ajustar aserciones y comentarios dependientes del pipe stock | S3, S4, S7 | `test/e2e/password-strength/password-strength.e2e-spec.ts`, `test/e2e/rbac/roles-crud.e2e-spec.ts`, `test/e2e/user/admin-create-user-permissions.e2e-spec.ts` | — |
| T4 | Verificación: e2e completo, suite unit, tsc, biome | todas | inline (parent) | — |
| T5 | Documentación: runbook de e2e y nota de alcance de la suite Hurl | S5 | `docs/e2e-testing.md`, `test/hurl/README.md` | — |

## Log

- **L1** (usuario, verbatim):

  > Usá la skill kickoff. Proyecto api-user, repo
  >  /home/leandrojaviercepeda/countergank/api-user.
  >    Quiero resolver la deuda técnica en este orden: COU-339, COU-340, COU-341.
  >
  >    Contexto que ya está resuelto:
  >    - develop tiene la suite Hurl completa (45 endpoints, 11 archivos) y Mailpit en
  >      docker-compose bajo el profile `mail`.
  >    - COU-326 agregó LoginDTO; COU-327 coercionó los overrides de entorno del ParameterStore.
  >
  >    Reglas operativas de este repo que hay que respetar:
  >
  >    1. COMMITS: nunca commitees sin autorización explícita mía para ese commit exacto,
  >       después de mostrarme `git status --short`, `git diff --stat` y el mensaje.
  >       El hook `.husky/pre-commit` exige GIT_COMMIT_APPROVED=1 inline en ese comando y
  >       corre la suite completa (~2 min); el pre-push la corre otra vez.
  >    2. REVIEW NATIVO: tiene un techo de salida medido. Candidatos de ~491 líneas completan;
  >       con 882 falla con `reviewer-empty-output` / `stopReason: length`. Si un candidato
  >       pasa de ~500 líneas, partilo antes de pedir review. Empezá siempre con
  >       gentle_review inspect y seguí la transición; si el stop es `managed_assets_outdated`,
  >       corré el `sync` que emite y reconsultá.
  >    3. CI: `gh run rerun` puede devolver 403 si el token no tiene actions:write. Para
  >       re-disparar los checks, cerrá y reabrí el PR. Ojo: cerrar/reabrir puede devolver
  >       el ticket a In Progress en Linear. Un fallo de `MongoMemoryReplSet` / ECONNREFUSED
  >       a puertos altos es flake del runner, no regresión.
  >    4. ENTORNO para correr e2e o la suite Hurl: Docker Desktop levantado, `make up`, y
  >       `docker compose --profile mail up -d mailpit`. Para la suite Hurl hace falta la app
  >       local en :3100 con `.env.hurl` (gitignoreado, base api_user_hurl, EMAIL a
  >       127.0.0.1:1025) y `JEST_WORKER_ID=1`, que activa directConnection.
  >
  >    Para cada ticket: verificá readiness (proyecto, estimate, asignado, branchName), movelo
  >    a In Progress, creá la rama desde origin/develop con --no-track usando el branchName de
  >    Linear, escribí odd/tasks/<feature>.md con las specs verbatim del ticket y el log, y
  >    trabajá con TDD (RED observado antes del fix). Al final: commit autorizado, push, PR
  >    contra develop con `fixes COU-###`, review nativo, y reporte con lo verificado y lo que
  >    no se pudo verificar.
  >
  >    Arrancá con COU-339.

- **L2** (readiness COU-339): proyecto `api-user`, estimate `2`, asignado `Leandro Javier Cepeda`,
  `branchName` = `feature/cou-339-alinear-el-harness-de-e2e-con-el-validationpipe-de`. Nada faltante.
  Ticket movido a `In Progress`; rama creada con `--no-track` desde `origin/develop` @ `b6ac58e`.
- **L3** (decisión, parent): el harness importa el pipe de producción en lugar de mantener una copia
  de las options. Copiar options es lo que permitió la divergencia que el ticket describe; importar
  el mismo símbolo hace que S6 se cumpla por construcción.
- **L4** (decisión, parent): `password-strength.e2e-spec.ts` no puede seguir afirmando códigos de
  regla, porque esos códigos nunca viajan en la respuesta del pipe de producción. S7 prohíbe tocar el
  pipe de producción y los códigos, así que se afirma el contrato real y se deja constancia en el
  spec de dónde queda la cobertura por regla. No es una expectativa más laxa en cobertura: es la
  expectativa correcta sobre este endpoint.
- **L5** (evidencia, RED → GREEN): con el pipe stock, los tres casos de login de COU-326 devolvían
  `code: "HTTP_400"` (`toMatchObject` falla en `helpers/validation-error.ts:15`). Con el harness
  alineado, `test/e2e/auth/auth.e2e-spec.ts` queda 18/18 verde.
- **L6** (evidencia, enumeración): e2e completo tras el cambio de harness → `22` suites, `269` tests,
  **`10` fallos, todos en `password-strength.e2e-spec.ts`** (los que afirmaban códigos de regla en
  `body.message`), `259` verde. No hubo ningún otro caso dependiente del pipe stock: el resto de los
  `code` que la suite ya afirmaba (`UA-COM-003`, `UA-EML-001`, `UA-SEC-001`, …) viene de
  `DomainError`, no del pipe.
- **L7** (evidencia, GREEN de T3): `password-strength.e2e-spec.ts` + `roles-crud.e2e-spec.ts` +
  `admin-create-user-permissions.e2e-spec.ts` → `39` tests, `3` suites, todo verde.
- **L8** (decisión, parent): se actualizan `docs/e2e-testing.md` y `test/hurl/README.md` porque ambos
  describían el estado previo: el runbook no explicaba qué replica el harness —que es justamente lo
  que se rompió— y el README de Hurl listaba “el `ValidationPipe` custom” como algo que sólo el e2e
  no podía ver. Un doc que describe un contrato viejo es deuda técnica con la misma firma que el bug.
- **Clasificación**: Task Size = **medium** — un helper, dos docs y cuatro specs e2e; el riesgo es que
  el cambio de pipeline mueva el contrato de todas las validaciones de la suite, y eso sólo se ve
  corriendo la suite completa (por eso T4 no es opcional).
- **L9** (evidencia, T4 verificación completa): `npm test` → `75` suites / `907` tests verde;
  `npm run test:e2e` → `22` suites / `269` tests verde; `tsc --noEmit` sin errores. `biome lint ./src`
  reporta errores **preexistentes** (`noDelete`, non-null assertion) en archivos que este ticket no
  toca — el diff no modifica `src/`, así que el resultado es idéntico al de `develop`.
