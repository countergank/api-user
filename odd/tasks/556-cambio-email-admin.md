# #556 — Añadir cambio de email por administrador en panel de usuarios

Feature branch: `feature/556-cambio-email-admin` (base `origin/develop`).
GitHub: countergank/api-user#556 · estimate 8 · assignee leandrojaviercepeda · board api-user (In Progress).

## Specs

- S1: "Endpoint admin (ruta a definir, ej. `POST /admin/users/:id/change-email`) que inicia el cambio con validación de unicidad del nuevo email."
- S2: "El código de verificación llega al nuevo email del usuario afectado, no al administrador." (decisión de diseño: el link de confirmación, no un código).
- S3: "El cambio queda registrado en audit-logs con actor administrativo y recurso usuario."
- S4: "Requiere permiso RBAC `user:update` (o el que se defina) — `403` sin él."
- S5: "`400` si el email ya existe o es inválido; `404` si el usuario no existe."
- S6: "Documentado en OpenAPI con DTO y ejemplos."
- S7 (decisión): "Link al nuevo email": el usuario confirma con el flujo existente `/auth/confirm-email-change`; se reutilizan `pendingEmail*`, transacción, `bumpSessionEpoch` y la ventana de reversión de 72 h. Nada de confirmación nueva.
- S8 (decisión): "Sí, email informativo": el buzón ACTUAL del usuario recibe un aviso de que un administrador inició el cambio (evento nuevo `EMAIL_CHANGE_ADMIN_REQUESTED` + template propio), además del link de confirmación al buzón nuevo.
- S9 (decisión): "Incluir cancelación en #556": endpoint admin que cancela el cambio pendiente (limpia `pendingEmail*`), para no esperar la expiración de 24 h.
- S10: El cambio admin-iniciado queda distinguible del self-service (flag `initiatedBy` en la entidad, sin migración: campo opcional).
- S11 (no-objetivos): "Cambio de email sin verificación (sin bypass del código)." · "Historial de emails anteriores."

## Tasks

- T1 (S1, S2, S4, S5, S7, S10, S3): campo `initiatedBy` en User + `POST /admin/users/:id/change-email` (controller admin + service): valida unicidad/email, guarda `pendingEmail*` con token reutilizable, emite `EMAIL_CHANGE_REQUESTED` al buzón nuevo (link existente), audit `admin.request-email-change`, guards JWT + `user:update` + admin. Unit tests RED→GREEN. Commit: `9bfcd73`.
- T2 (S8): evento `EMAIL_CHANGE_ADMIN_REQUESTED` + listener + template `email-change-admin-notice` + subjects i18n es/en/pt + seed defaults; el controller admin lo emite al buzón actual. Unit tests. Commit: `dd756a9` (pendiente de autorización al cierre del slice).
- T3 (S9, S3, S4): endpoint admin de cancelación del cambio pendiente (limpia `pendingEmail*`, audita `admin.cancel-email-change`, mismos guards), con notificación al usuario. Unit tests. Commit: incluido en el slice de cierre (ver L7).
- T4 (S6): DTOs + decorators OpenAPI de ambos endpoints con ejemplos. Commit: incluido en el slice de cierre (ver L7).
- T5 (S1–S9): e2e: happy path admin→confirm existente, 401/403/400/404, cancelación, aviso al buzón actual; bloque hurl + ENDPOINTS.md; suite completa verde. Commit: incluido en el slice de cierre (ver L7).

## Log

- L1: "perfecto! ahora si, vamos con kickoff" — selección del issue: "#556 Cambio de email por admin".
- L2: Decisión de diseño 2026-11-18 (elección explícita): "Link al nuevo email (recomendado)" — reutiliza `pendingEmailToken`, listeners, transacción, `bumpSessionEpoch`, confirm/revert tal cual; "Sí, email informativo (recomendado)" al buzón actual; "Incluir cancelación en #556".
- L3: Mapa del explorer (tarea mwm6p1et-2-l7d7): flujo self-service reutiliza `email-change-code.ts`, campos `pendingEmail*`/`previousEmail`/`emailRevertToken` (sin migración), `findByPendingEmailToken`/`findByEmailRevertToken`, listeners por slug; huecos: endpoint admin, autoría `initiatedBy`, aviso al buzón actual, cancelación, audit `admin.*`. Incertezas anotadas: `resourceId` de audits change-email posiblemente `undefined` (args del interceptor, no verificado en runtime); throttler dinámico parametrizado en DB; seeds de templates no revisados por el explorer.
- L4: T1 implementado (2026-11-18). Red: TS2551 `adminRequestEmailChange` inexistente observado antes de escribir el service. Green: 159/159 en las suites afectadas (service 71, controller 28, auth 60) + tsc limpio + biome limpio en lo tocado (warnings pre-existentes fuera del diff). Descubrimiento: el patrón del repo emite `EMAIL_CHANGE_REQUESTED` desde el CONTROLLER (con lang/name), no desde el service; el service devuelve el token y no lo emite. `invalidateUserCache` también emite por el mismo EventEmitter2 (`cache.invalidate.user`), por eso los tests filtran por evento. `emailChangeInitiatedBy` se setea 'self' en self-service y se limpia en confirm y revert (unsets ampliados).
- L5: Decisión del usuario: "reesolvemos todo aca, nada de ticket aparte" — los 36 errores biome error-level pre-existentes de ./src se resuelven en esta rama (commit `5fee08b`): helper `unsetEnv` en test-utils (Reflect.deleteProperty, asignar undefined setea el string "undefined"), specs sin non-null assertions ni vars muertas, transaction/i18n/exceptions-filter con checks reales, node:path en main.ts, biome-ignore documentado en las regex intencionales de sanitizeLogValue (#546). `biome lint --diagnostic-level=error ./src` queda en cero.
- L6: Slice boundary (2026-11-18): rama en 508 líneas autoreadas en 2 commits (9bfcd73 + 5fee08b), pasado el slice de ~400. Los commits restantes de #556 (T2-T5) se mantienen acotados por tarea; si un slice vuelve a exceder, evaluar chained PRs con la skill gentle-ai-chained-pr antes del próximo commit grande.
