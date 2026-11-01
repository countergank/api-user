# COU-348 — Exponer los KPIs de usuarios en un endpoint de métricas

Feature branch: `feature/cou-348-exponer-los-kpis-de-usuarios-en-un-endpoint-de-metricas` (base `origin/develop`).
Linear: COU-348 · estimate 3 · assignee Leandro Javier Cepeda.

## Specs

- S1: "`GET /admin/users/metrics` devuelve `{ total, active, locked, unverifiedEmail, newLast30Days, newPrevious30Days }`."
- S2: "Los seis conteos salen de una sola `aggregation`, no de varias consultas."
- S3: "`total` y `active` usan la misma regla que la lista (los borrados lógicos quedan afuera salvo que se pidan)."
- S4: "`locked` cuenta usuarios con `lockedUntil` en el futuro."
- S5: "`unverifiedEmail` usa la misma condición de verificación que la entidad (no una copia)."
- S6: "`newLast30Days` y `newPrevious30Days` cuentan usuarios por `createdAt` en los últimos 30 días y en los 30 anteriores, con la misma exclusión de borrados lógicos que `total`."
- S7: "Mismos guards que la lista (JWT + `user:read` + rol admin)."
- S8: "Swagger documentado y e2e con un usuario sembrado en cada estado (incluido uno por ventana de `createdAt`), afirmando los seis valores exactos."
- S9 (nota del ticket): "Ruta bajo `/admin/users/:algo`: declararla **antes** de `@Get(':id')` para que el parámetro no la capture."
- S10 (no-objetivos): "Métricas de otras entidades (roles, permisos, emails). Series temporales o histórico (los dos conteos de ventana no constituyen una serie: son dos números puntuales)."

## Tasks

- T1 (S2, S3, S4, S5, S6): aggregation `$facet` en `UserRepository` con `$match` compartido para la exclusión de soft-deletes; `User.UNVERIFIED_EMAIL_FILTER` como única fuente de la condición de verificación. Commit: `b942214`.
- T2 (S1, S7, S9): ruta `@Get('metrics')` declarada antes de `@Get(':id')` en `user.controller.ts`, con los mismos guards que la lista y `UserMetricsResponseDTO`. Swagger documentado (`MetricsUserDoc`). Commit: `b942214`.
- T3 (S8): e2e `admin-user-metrics.e2e-spec.ts` con deltas exactos sobre baseline (usuarios por estado y por ventana, backdate de `createdAt` por driver crudo), soft-delete excluido, 401/403. Commit: `b942214`.
- T4: bloque `# 28` en `test/hurl/user.hurl` (200 con las seis claves + 403 viewer) y fila en `test/hurl/ENDPOINTS.md`. Verificado con la API real en `:3100` (`api_user_hurl`): `user.hurl` completo, exit 0. Commit: `b942214`.

## Verificación

- e2e módulo user completo: 8 suites, 81 tests, todos en verde.
- Suite unitaria: 79 suites, 930 tests, todos en verde.
- `tsc --noEmit` limpio; biome limpio en los 7 archivos del cambio (warnings pre-existentes en archivos no tocados).
- Comments revisados con la skill code-comments: sin IDs de ticket ni referencias a specs en comentarios; solo quedan los que marcan efecto oculto (acoplamiento con `verifyEmail`, orden de rutas, comportamiento de `$count`, gotcha de timestamps en el e2e). El título del `describe` mantiene el ticket, como el resto de los specs e2e del repo.

## Log

- L1: "usemos la skill kickoff y vemos que tenemos como pendiente para avanzar"
- L2: "Revisemos cual es el proximo ticket de ui-user, quizas ese ticket va a necesitar algo de api-user y podriamos disponibilizarseo"
- L3: "En realidad se estan mostrando para 20 usuarios porque es la cantidad que en teoria trae la pagina, pero a mi criterio por los datos que muestran los graficos si tratamos de deducirlo, siendo esto para un dashboard, entiendo que en realidad son metricas totales globales de usuarios" — con cards: "Usuarios totales 18 +4,2% vs mes anterior / Usuarios activos — 95,1% del total / Usuarios bloqueados — lockout por intentos / Email sin verificar — reenviar verificación".
- L4: Decisión 2026-11-01: "Extender COU-348 con ventanas de 30 días" — la variación mensual se calcula en la UI con `newLast30Days` y `newPrevious30Days` servidos por el API; ticket actualizado en Linear con fecha.
- L5: Implementación completa (T1-T3). Hallazgo del e2e: con `timestamps: true`, findByIdAndUpdate no reescribe `createdAt` sembrado — el backdate va por el driver crudo (`userModel.collection.updateOne`).
