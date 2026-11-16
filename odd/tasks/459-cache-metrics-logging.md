# Feature #459 — [PERF-13] Cache Metrics & Logging

Issue: https://github.com/countergank/api-user/issues/459
Branch: `feature/459-cache-metrics-logging` (base `origin/develop`)

## Specs

- **S1** — "Logs de hit/miss rate cada N minutos"
- **S2** — "Integrar con el sistema de audit existente" · Decisión del usuario: auditar el **acceso al endpoint** (quién consultó y cuándo), igual que el resto de los admin endpoints. Con `AUDIT_LEVEL=standard` el `AuditInterceptor` no audita GETs, así que requiere `@AuditAction` explícito en el handler.
- **S3** — "Endpoint `GET /admin/cache/stats` (solo admin) para ver métricas en tiempo real"
- **S4** — "Métricas: hits, misses, hit rate, size, evictions" · `hits`/`misses`/`hitRate` ya existen en `CacheService.stats()`; falta `size` (conteo de claves `cache:*`) y `evictions` (`evicted_keys` de `INFO stats` de Redis).

## Tasks

- **T1** (S4): extender `CacheService` con `size` y `evictions` en `stats()`. Ruta: inline. **Hecho**: 30/30 unit (RED observado TS2339 → GREEN). Commit: _pendiente_.
- **T2** (S1): log periódico de hit/miss rate cada N minutos en `CacheService` (timer con `unref()`, intervalo por config con default, sin logs duplicados). Ruta: inline. **Hecho**: 30/30 unit; `CACHE_METRICS_LOG_INTERVAL_MINUTES` default 15. Commit: _pendiente_.
- **T3** (S2, S3): `CacheAdminController` con `GET /admin/cache/stats` — guards JWT + PermissionGuard + RolesGuard, `@Roles(ADMIN)`, `@RequirePermissions('cache:read')` (nuevo permiso seeded, ADMIN lo hereda por `ADMIN_PERMISSIONS=['*']`), `@AuditAction({ action: 'cache.stats.view', resource: 'cache' })`, DTO de respuesta, Swagger. Ruta: inline. **Hecho**: tsc limpio. Commit: _pendiente_.
- **T4** (S1–S4): e2e en `test/e2e/cache/cache-stats.e2e-spec.ts` — 401 sin auth, 403 usuario no admin, 200 admin con los cinco campos. Ruta: inline. Commit: _pendiente_.

## Log

- **L1** — "usa la skill kickoff" → issue #459 elegido, estimate 3, board `In Progress`, rama `feature/459-cache-metrics-logging` creada.
- **L2** — Decisión del usuario sobre S2: "Auditar el acceso al endpoint" (no snapshots periódicos en audit).
- **L4** — Evidence T4: e2e `test/e2e/cache/cache-stats.e2e-spec.ts` escrito (401/403/200 + shape de cinco campos) pero **no ejecutable**: MongoDB y Redis no disponibles localmente (Docker Desktop caído, sin binarios nativos). Suite unit completa: 1 fallo en primer run = flake Mongo documentado (COU-343), segundo run 1105/1105; suites rbac+config+app 284/284. tsc --noEmit limpio.
- **L3** — Evidence: `AuditAspectInterceptor` está registrado global (`APP_INTERCEPTOR` en `app.module.ts`) y lee metadata del handler, por lo que `@AuditAction` aplica directo en el método del controller. Patrón de admin controller: `src/config/parameters/parameter-admin.controller.ts`. Patrón e2e: `test/e2e/parameters/parameters.e2e-spec.ts`.
