# COU-321 — Alinear el tipo de lockedUntil con el ISO que expone la API

- **Feature**: `cou-321-lockeduntil-iso`
- **Issue**: https://linear.app/countergank/issue/COU-321/alinear-el-tipo-de-lockeduntil-con-el-iso-que-expone-la-api
- **Base**: `origin/develop` @ `6e8356c` — **Rama**: `feature/cou-321-alinear-el-tipo-de-lockeduntil-con-el-iso-que-expone-la-api`
- **Estado**: EN IMPLEMENTACIÓN

## Specs

Criterios de aceptación y alcance del ticket, citados verbatim.

- **S1** — “El tipo de `lockedUntil` coincide con lo que devuelve la API por HTTP.”
- **S2** — “Swagger sigue declarando `format: date-time` y el ejemplo es un ISO o `null`.”
- **S3** (scope incluido) — “que el tipo declarado coincida con lo que se serializa (tipar `string | null` convirtiendo en el constructor, o documentar y unificar la política de fechas del DTO).”
- **S4** (scope fuera) — “cambiar `createdAt`/`updatedAt` si la política elegida no lo pide; tocar entidades de base de datos.”

## Contexto

`src/user/dto/user.dto.ts` declara `lockedUntil: Date | null` y el constructor asigna
`user.lockedUntil ?? null`, o sea un `Date` en memoria. Por HTTP, ese mismo campo viaja como
**string ISO-8601** (o `null`), que es lo que consume el panel de administración. El tipo describe el
objeto en memoria, no el contrato: quien lea el DTO para escribir el cliente se lleva una promesa que
el JSON no cumple. El resto del DTO ya declara las fechas como `string` (`createdAt`, `updatedAt`).

Además, `src/user/api-docs/examples/user.examples.ts` repite el campo como `lockedUntil: Date | null`,
así que el ejemplo documentado también miente sobre el tipo.

## Diseño

- **`lockedUntil: string | null`** y conversión en el constructor:
  `this.lockedUntil = user.lockedUntil ? user.lockedUntil.toISOString() : null`. La entidad tipa
  `lockedUntil?: Date`, así que la conversión es explícita y no cambia nada por HTTP.
- **`user.examples.ts`**: `lockedUntil: string | null` para que el ejemplo documente el tipo real.
- **Sin tocar `createdAt`/`updatedAt` ni las entidades** (S4): la política de fechas del resto del DTO
  queda como está; este ticket alinea un campo, no rediseña el DTO.
- **La respuesta HTTP no cambia**: `JSON.stringify(new Date())` ya producía el mismo ISO. El cambio es
  de tipos y de verdad documental, no de comportamiento observable — y por eso mismo hay que probarlo
  por los dos lados: el unit del DTO (ahora string) y el e2e del endpoint (sigue siendo ISO o `null`).

## Tasks

| ID | Tarea | Specs | Ruta | Commit |
|----|-------|-------|------|--------|
| T1 | RED: spec del DTO afirmando tipo `string` e ISO, no `Date` | S1 | `src/user/dto/user.dto.spec.ts` | — |
| T2 | GREEN: tipo `string \| null` + conversión en el constructor | S1, S3 | `src/user/dto/user.dto.ts` | — |
| T3 | Ejemplo de Swagger con el tipo real | S2 | `src/user/api-docs/examples/user.examples.ts` | — |
| T4 | Verificación: unit del DTO, e2e del lock state, tsc, biome | S1, S2 | inline | — |

## Log

- **L1** (usuario, verbatim): “ok no hace falta el ticket de seguimiento, mergeado 444, y seguimos con el proximo ticket”.
- **L2** (readiness COU-321): proyecto `api-user`, estimate `2`, asignado `Leandro Javier Cepeda`,
  `branchName` = `feature/cou-321-alinear-el-tipo-de-lockeduntil-con-el-iso-que-expone-la-api`.
  Ticket movido a `In Progress`; rama creada con `--no-track` desde `origin/develop` @ `6e8356c`.
- **L3** (decisión, parent): se elige COU-321 entre los candidatos porque es el único del grupo que
  corrige un defecto y no higiene: el tipo declara `Date` para un valor que viaja como string. COU-319
  (derivar Swagger), COU-320 (doble cast en el spec) y COU-322 (spike de separar `UserDTO`) quedan como
  siguientes; COU-153 es High pero es una feature de cache con su propio roadmap.
- **L4** (decisión, parent): se toma la opción acotada del S3 —tipar `string | null` y convertir en el
  constructor— y **no** la de “unificar la política de fechas del DTO”, porque esa arrastra
  `createdAt`/`updatedAt`, que el propio ticket deja fuera salvo que la política lo pida.
- **Clasificación**: Task Size = **small** — un tipo, una conversión, un tipo en el ejemplo y el spec
  del DTO; el riesgo real es que el cambio de tipo arrastre consumidores, y eso lo dice `tsc`.
