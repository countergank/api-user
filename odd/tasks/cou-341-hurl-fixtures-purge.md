# COU-341 — Acotar el patrón que borra residuos en los fixtures de Hurl

- **Feature**: `cou-341-hurl-fixtures-purge`
- **Issue**: https://linear.app/countergank/issue/COU-341/acotar-el-patron-que-borra-residuos-en-los-fixtures-de-hurl
- **Base**: `origin/develop` @ `b6ac58e` — **Rama**: `feature/cou-341-acotar-el-patron-que-borra-residuos-en-los-fixtures-de-hurl`
- **Estado**: EN IMPLEMENTACIÓN

## Specs

Criterios de aceptación y alcance del ticket, citados verbatim.

- **S1** — “Un documento `hurl-*` creado a mano y **ajeno a la suite** sobrevive a la corrida de fixtures.”
- **S2** — “Los residuos de una corrida fallida de la suite siguen limpiándose.”
- **S3** — “Los fixtures siguen siendo idempotentes: correrlos dos veces deja la misma base.”
- **S4** — “Hay una verificación (test o script) que cubra el caso del documento ajeno.”
- **S5** (scope incluido) — “que el borrado se limite a lo que la suite crea de verdad, sin perder la idempotencia.”
- **S6** (scope fuera) — “cambiar los usuarios o roles que siembra la suite.”

## Contexto

`test/hurl/fixtures/seed-hurl.ts` purga por patrón antes de sembrar:

```ts
await userModel.deleteMany({ email: /^hurl[-.]/ });
await connection.collection('roles').deleteMany({ name: /^hurl-/ });
await connection.collection('emailtemplates').deleteMany({ slug: /^hurl-/ });
```

Funciona para la re-ejecutabilidad, pero borra más de lo que creó la suite: cualquier documento
`hurl-*` de la base de desarrollo desaparece, aunque lo haya creado una persona. La review de COU-325
lo marcó con tres advisories (`R3-001`, `R3-002`, `R3-003`).

Lo que la suite crea de verdad, hoy:

| Colección | Documentos de la suite |
|---|---|
| `users` | los 5 emails de `HURL_USERS` + `HURL_FREE_EMAIL` |
| `roles` | `hurl-role-temp` (`role.hurl`) |
| `emailtemplates` | `hurl-template-temp` (`email-template.hurl`) |

## Diseño

- **Una sola fuente de verdad para los residuos.** El módulo de fixtures exporta los identificadores
  exactos (`HURL_ROLE_NAMES`, `HURL_TEMPLATE_SLUGS`, `hurlUserEmails()`) y una función
  `purgeHurlResidues(connection, userModel)` que borra por `$in` sobre esa lista, no por regex. `main()`
  la usa. Si la suite empieza a crear otro rol o plantilla, se agrega a esa lista y la verificación
  sigue cubriendo el caso ajeno.
- **S2 no se pierde**: la lista es exactamente lo que la suite siembra, así que una corrida fallida
  deja esos mismos documentos y la siguiente los borra igual. La idempotencia (S3) no depende de que el
  patrón sea amplio, depende de que la purga cubra todo lo que la suite crea.
- **La verificación va a `test/` como `*.e2e-spec.ts`, y eso es deliberado.** CI corre `npm test`
  (rootDir `src`) y `npm run test:e2e` (rootDir `.`, testRegex `.e2e-spec.ts$`); `npm run
  test:helpers` **no** está en el workflow. Una verificación que sólo corre a mano no protege el
  criterio. El spec usa la misma Mongo del e2e, siembra los tres tipos de residuo **más** documentos
  `hurl-*` ajenos, corre la purga y afirma: residuos de la suite borrados, ajenos intactos, segunda
  corrida con el mismo resultado. Limpia sus propios documentos ajenos en `afterAll`.
- **`$in` sobre emails, no regex**: un email ajeno tipo `hurl.mine@dev.local` no está en la lista y no
  se toca, aunque empiece con `hurl.`.
- Nada de esto cambia los usuarios ni los roles que la suite siembra (S6).

## Tasks

| ID | Tarea | Specs | Ruta | Commit |
|----|-------|-------|------|--------|
| T1 | RED: verificación con residuo de la suite, documento ajeno y doble corrida | S1–S4 | `test/hurl/fixtures/seed-hurl-residues.e2e-spec.ts` | — |
| T2 | GREEN: purga por identificadores exactos en lugar de regex | S1–S3, S5 | `test/hurl/fixtures/seed-hurl.ts` | — |
| T3 | Verificación: e2e completo, unit, tsc, biome | S4 | inline | — |

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

- **L2** (readiness COU-341): proyecto `api-user`, estimate `1`, asignado `Leandro Javier Cepeda`,
  `branchName` = `feature/cou-341-acotar-el-patron-que-borra-residuos-en-los-fixtures-de-hurl`.
  Ticket movido a `In Progress`; rama creada con `--no-track` desde `origin/develop` @ `b6ac58e`.
- **L3** (decisión, parent): se borra por lista de identificadores exactos y no por prefijo más
  estrecho. Un prefijo (`/^hurl\.(flow|locked|...)/`) sigue siendo una regla adivinada; la lista es
  exactamente lo que la suite crea, y agregar un fixture nuevo obliga a tocar un solo lugar.
- **L4** (decisión, parent): la verificación se escribe como `*.e2e-spec.ts` porque el workflow sólo
  corre `npm test` (rootDir `src`) y `npm run test:e2e` (rootDir `.`). Con `test:helpers` quedaría
  fuera de CI y no protegería S1.
- **Clasificación**: Task Size = **small** — dos archivos de test/tooling, sin código de producción;
  el riesgo real es que la purga deje de limpiar lo que la suite crea, y eso lo cubre la verificación.
