# Feature #459 — [PERF-13] Cache Metrics & Logging

Issue: https://github.com/countergank/api-user/issues/459
Branch: `feature/459-cache-metrics-logging` (base `origin/develop`)

## Specs

- **S1** — "Logs de hit/miss rate cada N minutos"
- **S2** — "Integrar con el sistema de audit existente" · Decisión del usuario: auditar el **acceso al endpoint** (quién consultó y cuándo), igual que el resto de los admin endpoints. Con `AUDIT_LEVEL=standard` el `AuditInterceptor` no audita GETs, así que requiere `@AuditAction` explícito en el handler.
- **S3** — "Endpoint `GET /admin/cache/stats` (solo admin) para ver métricas en tiempo real"
- **S4** — "Métricas: hits, misses, hit rate, size, evictions" · `hits`/`misses`/`hitRate` ya existen en `CacheService.stats()`; falta `size` (conteo de claves `cache:*`) y `evictions` (`evicted_keys` de `INFO stats` de Redis).

## Tasks

- **T1** (S4): extender `CacheService` con `size` y `evictions` en `stats()`. Ruta: inline. **Hecho**: 30/30 unit (RED observado TS2339 → GREEN). Commit: `9f432c2`.
- **T2** (S1): log periódico de hit/miss rate cada N minutos en `CacheService` (timer con `unref()`, intervalo por config con default, sin logs duplicados). Ruta: inline. **Hecho**: 30/30 unit; `CACHE_METRICS_LOG_INTERVAL_MINUTES` default 15. Commit: `9f432c2`.
- **T3** (S2, S3): `CacheAdminController` con `GET /admin/cache/stats` — guards JWT + PermissionGuard + RolesGuard, `@Roles(ADMIN)`, `@RequirePermissions('cache:read')` (nuevo permiso seeded, ADMIN lo hereda por `ADMIN_PERMISSIONS=['*']`), `@AuditAction({ action: 'cache.stats.view', resource: 'cache' })`, DTO de respuesta, Swagger. Ruta: inline. **Hecho**: tsc limpio. Commit: `9f432c2`.
- **T4** (S1–S4): e2e en `test/e2e/cache/cache-stats.e2e-spec.ts` — 401 sin auth, 403 usuario no admin, 200 admin con los cinco campos. Ruta: inline. **Escrito y commiteado** (`9f432c2`); ejecución **pendiente** de infra (MongoDB/Redis locales caídos).

## Log

- **L1** — "usa la skill kickoff" → issue #459 elegido, estimate 3, board `In Progress`, rama `feature/459-cache-metrics-logging` creada.
- **L2** — Decisión del usuario sobre S2: "Auditar el acceso al endpoint" (no snapshots periódicos en audit).
- **L6** — Review nativa (RDD, lineage `review-9ddb7201cb76d0e0`): **approved** y acknowledgement quemado (tier medium, 3 lentes). 12 findings todos no-bloqueantes/disposition informational: R1-scan-per-request, R1-metrics-mask-redis-failure, R2-001 (intervalo denso), R2-002 (currentCounters duplica hit-rate), R2-003 (throttle sin constantes), R2-004/R3-admin-module-di-visibility (CacheAdminModule sin imports), R2-005 (labels S7 en e2e), R3-endpoint-contract-unexecuted (e2e no ejecutado), R3-interval-config-zero-coercion, R3-keyspace-scan-per-request, R3-silent-zero-on-redis-failure. Trabajo futuro, no reabren la review.
- **L7** — Decisión del usuario: los 12 findings de la review se corrigen acá, en un único commit, sin backlog. 7 correcciones reales (findings duplicados entre lentes): (1) intervalo con resolución consistente (inválido/negativo → default 15; fracción → 1 min), (2) stats() reutiliza currentCounters(), (3) memoización de size/evictions con TTL 60s (sin SCAN por request), (4) controller responde 503 ServiceUnavailable si Redis falla (sin zeros que enmascaren), (5) constantes de throttle con unidades, (6) CacheAdminModule importa CacheModule explícito, (7) labels e2e S3/S4 corregidos y e2e ejecutado (3/3 contra Mongo/Redis reales). Verificación: unit 34/34, suite 1109/1109, tsc limpio.
- **L5** — Commit autorizado por el usuario y ejecutado: `9f432c2` (`feat(cache): add admin metrics endpoint and periodic logging`, 10 archivos, +396/−8). Pre-commit corrió la suite completa: 88 suites, 1105/1105. Pendiente: ejecutar e2e cuando exista Mongo/Redis local; push y PR son decisión del usuario.
- **L4** — Evidence T4: e2e `test/e2e/cache/cache-stats.e2e-spec.ts` escrito (401/403/200 + shape de cinco campos) pero **no ejecutable**: MongoDB y Redis no disponibles localmente (Docker Desktop caído, sin binarios nativos). Suite unit completa: 1 fallo en primer run = flake Mongo documentado (COU-343), segundo run 1105/1105; suites rbac+config+app 284/284. tsc --noEmit limpio.
- **L3** — Evidence: `AuditAspectInterceptor` está registrado global (`APP_INTERCEPTOR` en `app.module.ts`) y lee metadata del handler, por lo que `@AuditAction` aplica directo en el método del controller. Patrón de admin controller: `src/config/parameters/parameter-admin.controller.ts`. Patrón e2e: `test/e2e/parameters/parameters.e2e-spec.ts`.
