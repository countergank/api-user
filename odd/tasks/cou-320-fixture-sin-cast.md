# COU-320 — Tipar el fixture de UserDTO sin doble cast en el spec

- **Feature**: `cou-320-fixture-sin-cast`
- **Issue**: https://linear.app/countergank/issue/COU-320/tipar-el-fixture-de-userdto-sin-doble-cast-en-el-spec
- **Base**: `origin/develop` @ `6e8356c` — **Rama**: `feature/cou-320-tipar-el-fixture-de-userdto-sin-doble-cast-en-el-spec`
- **Estado**: EN IMPLEMENTACIÓN

## Specs

Criterios de aceptación y alcance del ticket, citados verbatim.

- **S1** — “El spec no usa `as unknown as` para construir el escenario.”
- **S2** — “El caso sigue verificando `lockedUntil === null` y `failedLoginAttempts === 0`.”
- **S3** (scope incluido) — “expresar el documento sin la propiedad de forma que el compilador acompañe (borrar la clave sobre un tipo parcial, o un fixture tipado).”
- **S4** (scope fuera) — “cambiar `UserDTO` o el comportamiento del mapeo; el caso a cubrir es el mismo (`lockedUntil: null`, `failedLoginAttempts: 0`).”

## Contexto

`src/user/dto/user.dto.spec.ts` construye el escenario “cuenta nunca bloqueada” así:

```ts
user.failedLoginAttempts = undefined as unknown as number;
```

El doble cast desactiva el chequeo de tipos justo donde se prueba el comportamiento defensivo del
DTO: si mañana `failedLoginAttempts` deja de ser opcional, el test sigue compilando y deja de probar
lo que dice probar.

## Diseño

El escenario no necesita asignar nada: `UserMock` extiende `User` y **no** inicializa
`failedLoginAttempts`, así que una instancia nueva ya representa el documento sin el campo. La línea se
elimina y queda un comentario que dice qué representa ese estado.

Por qué el compilador acompaña mejor así: el cast forzaba un valor inválido (`undefined` como
`number`) y tapaba el cambio de contrato; sin el cast, si el campo pasara a ser obligatorio, la
construcción del fixture dejaría de compilar y el test dejaría de mentir.

## Tasks

| ID | Tarea | Specs | Ruta | Commit |
|----|-------|-------|------|--------|
| T1 | Quitar el doble cast y documentar el estado del fixture | S1, S3 | `src/user/dto/user.dto.spec.ts` | — |
| T2 | Verificación: spec, tsc, ausencia del cast | S1, S2 | inline | — |

## Log

- **L1** (usuario, verbatim): “sigamos” (a continuación de “ok no hace falta el ticket de seguimiento, mergeado 444, y seguimos con el proximo ticket”).
- **L2** (readiness COU-320): proyecto `api-user`, estimate `1`, asignado `Leandro Javier Cepeda`,
  `branchName` = `feature/cou-320-tipar-el-fixture-de-userdto-sin-doble-cast-en-el-spec`.
  Ticket movido a `In Progress`; rama creada con `--no-track` desde `origin/develop` @ `6e8356c`.
- **L3** (decisión, parent): cambio inline y no delegado — es una línea en un spec, sin código de
  producción; el costo de arrancar un worker supera al del cambio.
- **L4** (sin RED): no hay comportamiento que cambie, es tipado de un fixture. Corresponde explicarlo y
  verificar en proporción: el spec sigue verde, `tsc` limpio y el cast desaparece del archivo.
- **Clasificación**: Task Size = **small** — una línea borrada más un comentario.
