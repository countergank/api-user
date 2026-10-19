# COU-263 — Exigir confirmación de identidad en el cambio de email

- **Feature**: `cou-263-codigo-identidad-cambio-email`
- **Issue**: https://linear.app/countergank/issue/COU-263/exigir-confirmacion-de-identidad-en-el-cambio-de-email
- **Base**: `origin/develop` @ `9482e80` — **Rama**: `fix/COU-263-codigo-identidad-cambio-email`
- **Estado**: EN PLANIFICACIÓN — ticket normalizado y en `In Progress`.

## Specs

Criterios de aceptación del ticket (verbatim, ya normalizado tras la revisión de diseño).

- **S1** — “Solicitar el cambio **sin código** responde `400`; con código incorrecto, vencido o con
  intentos agotados responde `401`.”
- **S2** — “El código se guarda hasheado, expira a los 10 minutos y no se puede reutilizar tras un
  cambio exitoso.”
- **S3** — “El email **no** cambia hasta confirmar con el token al email nuevo.”
- **S4** — “Al aplicar el cambio se revoca cada refresh token previo (regresión de COU-264) y se
  notifica al email anterior.”
- **S5** — “El link de reversión revierte el email dentro de las 72 h, revoca sesiones y notifica a
  ambos emails; fuera de la ventana responde `410`.”
- **S6** — “Revertir dos veces es idempotente y no reabre sesiones.”
- **S7** — “Cambiar al mismo email que ya tiene responde `400`.”
- **S8** — “El código nunca aparece en logs ni en la respuesta HTTP.”
- **S9** — “E2E: solicitar → cambiar → confirmar → sesiones previas caídas → revertir.”

Del scope del ticket (verbatim).

- **S10** — “Código de verificación de **6 dígitos enviado al email actual** como prueba de
  identidad al solicitar el cambio.”
- **S11** — “Estado del código en el documento del usuario: hash (nunca en claro), expiración (10
  min), intentos máximos (5), un solo uso y límite de reenvío con throttling.”
- **S12** — “Notificación al email **anterior** al solicitar el cambio y al aplicarlo.”
- **S13** — “**Ventana de reversión**: link «no fui yo» al email anterior, válido 72 h, que revierte
  el cambio y revoca sesiones. Requiere guardar el email anterior.”
- **S14** — “`@AuditAction` en solicitud, confirmación y reversión.”

Decisiones del parent.

- **S15** — **Contraseña descartada como prueba**: `forgotPassword` emite el reset por email
  (`src/auth/auth.service.ts:204-216`) y `resetPassword` setea la contraseña con ese token (`:232`),
  así que quien controla el buzón ya controla la contraseña; exigirla no agrega protección real.
- **S16** — El flujo **no** aplica nada hasta el token al email nuevo (ya existe) y la invalidación
  de sesiones ya se implementó en COU-264: acá se verifica con test de regresión, no se re-implementa.
- **S17** — La reversión exige conocer el token del link: **no lleva guard de JWT**, igual que
  `/auth/confirm-email-change`. El token es la prueba; el usuario puede estar deslogueado.
- **S18** — Fuera de alcance: MFA (solución de fondo de OWASP, merece su propio ticket),
  `change-password`, eliminar `confirm-email-change`, CRUD de plantillas.

## Diseño

**Endpoints**

| Método | Ruta | Guard | Propósito |
|---|---|---|---|
| `POST` | `/users/change-email/code` | JWT | Emite el código de 6 dígitos al email **actual** (S10, S11) |
| `POST` | `/users/change-email` | JWT | `{ email, code }`: valida el código y deja el cambio **pendiente** (S1, S3) |
| `POST` | `/auth/confirm-email-change` | — | Existente: aplica el cambio, revoca sesiones, notifica (S3, S4) |
| `POST` | `/auth/revert-email-change` | — | `{ token }`: revierte dentro de la ventana (S5, S6, S17) |

**Estado en el documento `User`** (aditivo, sin migración)

- `emailChangeCodeHash` (sha256 del código + id del usuario), `emailChangeCodeExpires`,
  `emailChangeCodeAttempts`, `emailChangeCodeSentAt` (para el throttling de reenvío).
- `previousEmail`, `emailRevertToken`, `emailRevertExpires` — seteados al aplicar el cambio (S13).

**Reglas**

- Código: 6 dígitos con `crypto.randomInt`; hash sha256 en reposo; TTL 10 min; 5 intentos y el
  contador se incrementa en cada fallo; al agotarse, el código se invalida (S1, S2, S11). Reenvío
  permitido sólo después de 60 s desde el último envío (S11).
- `POST /users/change-email` compara `email` con el actual → `400` (S7); sin `code` → `400` por DTO
  (S1); código inválido/vencido/agotado → `401 INVALID_EMAIL_CHANGE_CODE` (kind nuevo, ver S14).
- Al aplicar (`confirmEmailChange`): guarda `previousEmail`, genera el token de reversión (72 h),
  revoca sesiones (existente) y emite notificación a **ambos** emails (S4, S12).
- Reversión: si `emailRevertExpires < now` → `410`; si ya se revirtió → `200` idempotente sin tocar
  estado ni sesiones (S5, S6).

**Eventos y plantillas**

- Eventos nuevos en `EmailEvents`: `EMAIL_CHANGE_CODE_REQUESTED`, `EMAIL_CHANGE_REQUESTED_OLD`
  (aviso al email anterior), `EMAIL_CHANGE_REVERTED`.
- Slugs nuevos en `src/database/seeds/seed-email-templates.ts`: `email-change-code`,
  `email-change-old-notice`, `email-change-reverted`. Los emails se emiten igual aunque
  `EMAIL_ENABLED=false` en test: los specs capturan eventos, no SMTP.

## Tasks

| ID | Tarea | Specs | Ruta | Commit |
|----|-------|-------|------|--------|
| T1 | Estado del código y del revert en la entidad + kind `INVALID_EMAIL_CHANGE_CODE` | S2, S11, S14 | delegado (worker) | 1 |
| T2 | `requestEmailChangeCode` + `requestEmailChange` con validación de código, intentos, TTL y reenvío | S1, S2, S7, S8, S11 | delegado (worker) | 1 |
| T3 | Aplicar el cambio con `previousEmail` + token de reversión y notificación a ambos emails | S3, S4, S12, S13 | delegado (worker) | 1 |
| T4 | `revertEmailChange` (410 fuera de ventana, idempotente) + auditoría | S5, S6, S14, S17 | delegado (worker) | 1 |
| T5 | Rutas, DTOs, Swagger, i18n y eventos/plantillas | S10, S12, S14 | delegado (worker) | 1 |
| T6 | Unit (código, intentos, TTL, reversión) + e2e del flujo completo | S1–S9 | delegado (worker) | 1 |
| T7 | Verificación (tsc, biome, suite, e2e en CI) y RDD | todas | inline (parent) | — |

## Entrega

- Estrategia: **single-pr** contra `develop`, la misma de COU-264/268/269/304.
- Rebanada **real: 2102 líneas** en 44 archivos (34 `.ts`/`.json` + 9 plantillas HTML + el documento),
  muy por encima de la estimación de ~450–600. Se aplicó el split previsto en **dos commits** dentro
  del mismo PR: (1) dominio y servicio — entidad, kinds, ciclo del código, gating y confirm/revert,
  961 líneas; (2) superficie HTTP, emails y tests — rutas, DTOs, Swagger, i18n, eventos, listener,
  plantillas y e2e, ~1140 líneas. El segundo sigue por encima de 400 líneas, pero su contenido es
  mayormente tests y plantillas, donde el costo de revisión por línea es menor.
- El e2e se valida en CI; en local corrimos la suite unit.

## Log

- **L1** (usuario, verbatim): “vamos con la recomendada, pero antes revisemos si el ticket quedaria
  coherente con lo que debe llevar la implemnentacion, sino l odeberiamos editar”.
- **L2** (usuario, verbatim): “ok, te recuerdo que encaramos esto con ODD y los tickets asociados al
  a implementacion debe pasarse a los estados correctos”.
- **Diseño acordado**: código de 6 dígitos al email **actual** + notificación al email anterior +
  ventana de reversión de 72 h. Sustituye a la contraseña, con el argumento de S15.
- **Fuentes revisadas**: OWASP *Changing A User's Registered Email Address*, OWASP ASVS 2.2.2 y
  2.2.3, GitHub *sudo mode*.
