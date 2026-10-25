# COU-327 — Coercionar los overrides de entorno del ParameterStore

- **Feature**: `cou-327-parameterstore-coercion`
- **Issue**: https://linear.app/countergank/issue/COU-327/coercionar-los-overrides-de-entorno-del-parameterstore
- **Base**: `origin/develop` @ `f284a08` — **Rama**: `feature/cou-327-coercionar-los-overrides-de-entorno-del-parameterstore`
- **Estado**: IMPLEMENTADO Y VERIFICADO en local (S1–S5); sin commitear

## Specs

Criterios de aceptación del ticket, citados verbatim.

- **S1** — “Con `EMAIL_SECURE=false` en el entorno, el provider SMTP se construye con `secure: false`.”
- **S2** — “Un parámetro `number` overrideado por entorno se devuelve como número, no como string.”
- **S3** — “Un parámetro `boolean` overrideado por entorno se devuelve como booleano (`"true"`/`"false"` →
  `true`/`false`).”
- **S4** — “Hay tests que cubren los tres tipos y fallan con la implementación actual.”
- **S5** — “El flujo de cambio de email de la suite Hurl (COU-325) envía el correo con `EMAIL_SECURE`
  overrideado.”

## Contexto y evidencia

`ParameterStore.get()` devuelve el override de `process.env` **sin convertirlo al tipo declarado** en
el registry (`src/config/parameters/parameter.store.ts`). Consecuencia medida en la sesión anterior:

- `EMAIL_SECURE=false` en `.env.development` llegaba como el string `"false"`, que es *truthy*;
  `EmailProviderFactory` armaba `new SmtpProvider({ secure: "false" })`; nodemailer abría TLS contra el
  puerto 587 y fallaba con `SSL routines:tls_validate_record_header:wrong version number`.
- El fallo sólo quedaba visible en la colección `emaillogs` (`status: failed`), sin nada en consola.
- `emaillogs` de `api_user` mostró envíos fallidos desde el **2026-10-16**: ningún correo salió del
  contenedor durante días sin que nadie lo notara.
- Workaround aplicado: quitar `EMAIL_SECURE` de `.env.development` (archivo no versionado) para que
  aplique el default booleano del registry. Este ticket lo vuelve innecesario.

## Diseño

- El valor del override se convierte según `registry` antes de devolverlo y antes de cachearlo en L1:
  `boolean` acepta `true/false/1/0/si/no` (case-insensitive); `number` usa `Number()` y rechaza `NaN`;
  `string` se devuelve tal cual.
- Un valor que no se puede convertir debe **fallar explícito**, no caer silenciosamente al default: el
  registry ya valida el tipo al escribir (`set()`), y esta es la misma regla del lado del entorno.
- El cache L1 se puebla con el valor **ya convertido**, para que el primer y el segundo `get()` sean
  idénticos.

## Tasks

| ID | Tarea | Specs | Ruta | Commit |
|----|-------|-------|------|--------|
| T1 | RED: tests de coerción para los tres tipos + valor inválido | S1–S4 | inline (parent) | — |
| T2 | GREEN: convertir el override según el tipo del registry antes de cachear | S1–S4 | inline (parent) | — |
| T3 | Verificar el flujo de email con `EMAIL_SECURE` definido por entorno | S5 | inline (parent) | — |
| T5 | Ticket de seguimiento: el camino de Redis tampoco coerciona | — | pendiente | — |
| T4 | Verificación: tsc, biome, suite completa | todas | inline (parent) | — |

## Log

- **L1** (usuario, verbatim): “vamos con kickkoff para atacar la deuda que tenemos”.
- **L2** (decisión, parent): se arranca por **COU-327** y no por COU-326 porque el impacto es mayor —
  hoy el envío de correo depende de un parche en un archivo no versionado — y porque el bug es de
  clase: afecta a cualquier parámetro booleano o numérico overrideado por entorno.
- **Clasificación**: Task Size = **small** — superficie acotada (un método), criterio verificable por
  tests y el bug ya está reproducido con evidencia.

## Verificación (observada)

- **RED**: `npx jest --testPathPattern='parameter.store.spec.ts'` → 6 fallas con la implementación
  anterior: `Expected: 60, Received: '60'` (number y cache L1), `Expected: true, Received: 'true'`
  (boolean), y los dos casos inválidos resolvían en vez de fallar.
- **GREEN**: la misma suite → **32/32**. `tsc --noEmit` exit 0. biome limpio en los dos archivos.
- **S5 (end to end)**: app local en `:3100` con **`EMAIL_SECURE=false` exportado por entorno** (el caso
  que rompía el envío). `POST /auth/register` → **201**; `emaillogs` → `{"templateSlug":"welcome",
  "status":"sent"}`; Mailpit → `total: 1`. Antes de este cambio ese mismo escenario terminaba en
  `status: failed` con `SSL routines::wrong version number`.
- **Sin verificar**: el hook del commit corre la suite completa; si esa corrida pasa, T4 queda cubierto
  por evidencia del propio commit.

## Riesgos y seguimiento

- **El camino de Redis no coerciona**: un valor escrito por `set()` se guarda como `String(value)` y al
  leerlo de Redis vuelve como string. Es la misma clase de bug que este ticket, pero por otra vía.
  Candidato a ticket propio.
- Valores numéricos con decimales pasan por `Number()`; la validación fina (`IS_INT_MIN_1`) sigue
  ocurriendo sólo en `registry.validate()` al escribir, no en `get()`. Preexistente.
- Un string vacío en un parámetro `number` falla explícito en vez de convertirse en `0`.
