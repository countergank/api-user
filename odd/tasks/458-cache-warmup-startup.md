# Feature #458 — [PERF-14] Cache Warm-up on Startup

Issue: https://github.com/countergank/api-user/issues/458
Branch: `feature/458-cache-warmup-startup` (base `origin/develop`)
Estimate: 5 (board actualizado desde 3 tras la decisión de alcance de L2)

## Specs

- **S1** — "En `OnApplicationBootstrap`: 1. Cargar roles y permisos → cache RBAC"
- **S2** — "2. Cargar templates activos → cache email" · Decisión del usuario (L2): incluye **construir primero** el cache de templates (hoy no existe: `EmailTemplateService` lee directo del repositorio y la invalidación `cache:email-template:*` ya está cableada). Read-path cachea por slug en `findBySlug`/`resolve`; el warm-up precarga los templates activos.
- **S3** — "3. Opcional: usuarios más activos (si se puede determinar)" · Descartado en L2: fuera de alcance.
- **S4** — Tolerancia a fallos (acordado con el usuario): un fallo del warm-up se loguea y **nunca bloquea el arranque** de la API; el cache se llena on-demand como hoy. Precedente: warm-up de versión en `AppService.onApplicationBootstrap`.

## Tasks

- **T1** (S2): read-path de cache de templates en `EmailTemplateService` — `findBySlug` y `resolve` consultan `cache:email-template:<slug>` antes del repositorio, set con TTL, fallo de cache → fallback a DB con warn (patrón de `PermissionService`). Ruta: inline. **Hecho**: RED (4 fails) → GREEN 29/29 spec, 59/59 suite email, tsc limpio. Commit: `9c3b8fb`.
- **T2** (S1, S2): `CacheWarmupService` con `OnApplicationBootstrap` — calienta `permissions:all`, `roles:all` y templates activos; try/catch por paso, log de duración y conteo por ítem, flag `CACHE_WARMUP_ENABLED` (default `true`). Ruta: inline. **Hecho**: RED observado (TS2339) → GREEN. Piezas: `src/config/cache/cache-warmup.service.ts` (registrado en `AppModule`), `EmailTemplateRepository.findActive()` (una query), `EmailTemplateService.warmCache()`, `EmailModule` exporta `EmailTemplateService`. Suite completa 1172/1172, tsc limpio. Commit: `9c3b8fb`.
- **T3** (S1–S4): unit tests del warm-up (éxito, fallo parcial no bloquea arranque, flag off) y del cache de templates (hit, miss→DB, invalidación). Ruta: inline. **Hecho**: `cache-warmup.service.spec.ts` (4 tests: warma los tres pasos, fallo de un paso no bloquea, flag off salta todo, corre por default) + `email-template.service.spec.ts` (6 tests PERF-14 read-path + 2 warmCache). Incluidos en el GREEN de arriba.
- **T4** (S1, S2): e2e contra Mongo/Redis reales (arranque con caches calientes). Ruta: inline. **Escrito** (`test/e2e/cache/cache-warmup.e2e-spec.ts`, 3 asserts: permissions:all, roles:all, template welcome presentes tras `createTestApp` sin ningún request previo). **Ejecución pendiente**: Docker daemon caído, sin mongod/redis-cli nativos (mismo bloqueo documentado en #459 L4).

## Log

- **L1** — "Usa la skill kickoff" → kickoff ejecutado: issue #458 elegido (continuidad serie PERF), estimate inicial 3, board `In Progress`, rama `feature/458-cache-warmup-startup` desde `origin/develop`.
- **L2** — Decisión de alcance del usuario: "RBAC + cache de templates" — el #458 incluye construir el cache de templates de email (read-path) además del warm-up RBAC; se descarta "usuarios más activos" (S3). Estimate sube a 5 (escrito en el board).
- **L3** — Evidence: implementación completa RED→GREEN. T1 read-path cache templates (`cache:email-template:<slug>`, TTL 15min, negative caching, fallback DB con warn). T2 `CacheWarmupService` (`src/config/cache/cache-warmup.service.ts`, flag `CACHE_WARMUP_ENABLED` default true, un warn por paso fallido, nunca bloquea bootstrap) + `EmailTemplateRepository.findActive()` + `EmailTemplateService.warmCache()` + `EmailModule` exporta `EmailTemplateService` + registro en `AppModule`. Suite unit completa 1172/1172 (90 suites), tsc limpio. T4 e2e escrito, no ejecutable por infra.
- **L4** — Commit autorizado por el usuario y ejecutado: `9c3b8fb` (`feat(cache): warm up RBAC and email template caches on startup`, 9 archivos, +306/−5). Pre-commit corrió la suite completa: 90 suites, 1172/1172. Nota: primer intento de commit falló sin staged files (suite igualmente 1172/1172); repetido con stage explícito de los 9 archivos autorizados. Pendiente: e2e cuando exista Mongo/Redis local; push y PR son decisión del usuario.
