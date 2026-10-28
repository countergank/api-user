# COU-340 — Coercionar los valores leídos de Redis en el ParameterStore

- **Feature**: `cou-340-parameterstore-redis-coercion`
- **Issue**: https://linear.app/countergank/issue/COU-340/coercionar-los-valores-leidos-de-redis-en-el-parameterstore
- **Base**: `origin/develop` @ `b6ac58e` — **Rama**: `feature/cou-340-coercionar-los-valores-leidos-de-redis-en-el-parameterstore`
- **Estado**: EN IMPLEMENTACIÓN

## Specs

Criterios de aceptación y alcance del ticket, citados verbatim.

- **S1** — “Un `boolean` escrito con `set(false)` se lee como booleano `false`, no como el string `"false"`.”
- **S2** — “Un `number` escrito con `set(60)` se lee como número `60`.”
- **S3** — “Un valor no convertible falla explícito, con la misma regla que el camino de entorno.”
- **S4** — “Hay tests de los tres tipos y de la caché L1.”
- **S5** — “El comportamiento de COU-327 sigue cubierto y verde.”
- **S6** (scope incluido) — “que el valor leído de Redis respete el `type` del registry, igual que el override de entorno.”
- **S7** (scope fuera) — “cambiar el formato de almacenamiento en Redis más allá de lo necesario, o tocar los defaults del registry.”

## Contexto

`ParameterStore.set()` persiste `String(value)`, así que `false` queda como `"false"` en Redis. Al
leerlo, `get()` devuelve el string tal cual y lo cachea así en L1:

```ts
const redisValue = await this.redisService.get(`${PREFIX}${key}`);
if (redisValue !== null) {
  this.l1Cache.set(key, { value: redisValue, expiresAt });   // string crudo
  return redisValue;
}
```

Un consumidor booleano (`src/email/email.provider.factory.ts` hace
`(await this.parameterService.get('EMAIL_SECURE')) as boolean`) recibe `"false"`, que es *truthy*.
COU-327 arregló el mismo defecto por la vía de los overrides de entorno (`coerceOverride`), pero el
camino de Redis quedó intacto: el bug aparece cuando el valor se cambia en runtime, no por `.env`.

## Diseño

- **Una sola regla de coerción.** `coerceOverride()` ya implementa exactamente la regla que S3 pide
  (“la misma regla que el camino de entorno”): boolean acepta `true/false/1/0/si/no` sin distinguir
  mayúsculas y falla con un mensaje que nombra la clave y el valor; number descarta vacío, `NaN` e
  `Infinity`. Se extrae a un único método de coerción por `type` del registry y lo usan los dos
  caminos (override de entorno y valor leído de Redis). No se duplica la lógica.
- **El error no puede quedar absorbido.** `get()` envuelve el acceso a Redis en un `try/catch` que
  degrada al default del registry (“Redis failure”). Si la coerción se hiciera dentro de ese `try`,
  un valor corrupto terminaría devolviendo el default en silencio, que es justo lo contrario de S3.
  La coerción se aplica **fuera** de ese `catch` para que el error se propague.
- **L1 guarda el valor ya coercionado**, igual que hace hoy con el override de entorno: el tipo de la
  primera lectura es el tipo de todas (S4). El TTL no cambia.
- **Sin cambios de formato ni de defaults** (S7): se sigue persistiendo `String(value)`.

## Tasks

| ID | Tarea | Specs | Ruta | Commit |
|----|-------|-------|------|--------|
| T1 | RED: tests de boolean/number/string, valor no convertible y coherencia de la caché L1 | S1–S4 | `src/config/parameters/__tests__/parameter.store.spec.ts` | — |
| T2 | GREEN: coerción única compartida por el camino de entorno y el de Redis | S1–S3, S6 | `src/config/parameters/parameter.store.ts` | — |
| T3 | Verificación: COU-327 sigue verde, suite unit completa, tsc, biome | S5 | inline | — |

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

- **L2** (readiness COU-340): proyecto `api-user`, estimate `2`, asignado `Leandro Javier Cepeda`,
  `branchName` = `feature/cou-340-coercionar-los-valores-leidos-de-redis-en-el-parameterstore`.
  Ticket movido a `In Progress`; rama creada con `--no-track` desde `origin/develop` @ `b6ac58e`.
- **L3** (decisión, parent): el valor leído de Redis se coerciona con la **misma** función que el
  override de entorno, extraída a un solo método. S3 pide “la misma regla”, y tener dos
  implementaciones de la misma regla es cómo se llega al bug que este ticket arregla.
- **L4** (decisión, parent): la coerción se ubica fuera del `catch` que degrada a default. Dejar que
  el `catch` de “Redis failure” absorba un valor corrupto convertiría una configuración inválida en
  un default silencioso, y S3 exige falla explícita.
- **Clasificación**: Task Size = **small** — un método extraído y un punto de llamada en un archivo,
  más casos en un spec existente; el bug está localizado y el criterio es verificable por unit tests.
- **L5** (evidencia, T1 RED): 6 casos nuevos fallaban con el código anterior —
  `set(false)` se leía `"false"`, `set(60)` se leía `"60"`, los valores no convertibles se devolvían
  tal cual (`"abc"`, `"maybe"`) y la caché L1 guardaba `"60"`. El caso de `string` pasaba antes y
  después (no necesita coerción): queda como guarda de regresión.
- **L6** (evidencia, T2 GREEN): `Tests: 40 passed, 40 total` en `parameter.store.spec.ts`, con los 34
  casos previos (incluidos los 8 de COU-327) sin tocar.
- **L7** (decisión, parent): **no** se cambia el mensaje de error del camino de Redis. La función
  compartida dice `invalid number/boolean override` y la aserción de COU-327
  (`rejects non-finite number overrides like Infinity`) ancla ese texto: reescribirla para acomodar un
  mensaje nuevo habría tocado un caso que el ticket pide explícitamente dejar verde. Queda anotado como
  nit de wording para un ticket de mensajes, no para este.
- **L8** (decisión, parent): se acepta el cambio de forma del `catch` que reporta el worker — si una
  clave no existe en el registry, el `throw` de `not found in registry` ya no viene precedido del
  warning `Redis read failed`. El error final es idéntico y el caso real (clave registrada) no cambia;
  prefiero la lectura lineal del nuevo `get()` antes que preservar un warning engañoso.
- **L9** (evidencia, verificación del parent): `npm test` → `75` suites / **`914`** tests verde (907
  previos + 7 nuevos); `npm run test:e2e` → `22` suites / **`269`** tests verde, sin cambios en e2e;
  `tsc --noEmit` sin errores. Biome: 7 errores `noNonNullAssertion` preexistentes en specs de
  parámetros que este ticket no toca, 0 en los dos archivos modificados.
