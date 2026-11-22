# 531 — Migrar secrets de Doppler a Infisical Cloud

Issue: https://github.com/countergank/api-user/issues/531 (chore, infra, estimate 3)
Branch: `feature/531-migrar-secrets-infisical-cloud` (base `origin/develop`)

## Specs

S1. «Proyecto creado en Infisical Cloud con entornos (development, production) y todas las variables de `.env.example` y `.env.production.example`.»
S2. «El dev local levanta con `infisical run` sin `.env` manual.»
S3. «El runtime (docker-compose) consume secrets vía machine identity de Infisical.»
S4. «Los workflows de GitHub Actions obtienen sus secrets sin Doppler.»
S5. «Sin referencias residuales a Doppler en Makefile, `scripts/`, Dockerfile, docker-compose y docs.»
S6. Fuera de scope: «migración de otros proyectos de la org, cambios de lógica de la aplicación, nuevos entornos (qa/staging).»

## Tasks

- T1 · S1 · Crear proyecto api-user en Infisical Cloud (development, production) con todas las variables de `.env.example` y `.env.production.example` · commit: —
  - Proyecto y entornos creados por la persona vía consola web: dev/staging/prod. Dev verificado con 45 vars (post-borrado de leftovers). Desviación aceptada por la persona: `prod` queda vacío porque no hay despliegue productivo; se completará cuando exista. Comparación de nombres contra los `.example` pendiente (política bloquea lectura).
- T2 · S2 · Dev local: `infisical run` / resolver reemplaza `.env` manual (Makefile, `scripts/resolve-env.sh`) · commit: —
  - Hecho y verificado 2026-11-22: `.infisical.yaml` creado; `resolve-env.sh` reescrito (ENV_FILE → Infisical → `.env.<env>`); Makefile consolida `dev`, `docker:rebuild` y `migrate*` en una sola ruta. Evidencia: `env ← Infisical (env dev)`, 48 vars, perms 600; `infisical run` inyecta NODE_ENV/JWT_SECRET/DATABASE_USER/ENCRYPTION_PASSWORD (set); `docker compose config --quiet` OK con COMPOSE_PROFILES=storage-s3; fallbacks (sin CLI, ENV_FILE inválido) OK.
- T3 · S3 · docker-compose runtime consume secrets vía machine identity de Infisical · commit: —
  - Hecho y verificado 2026-11-22: `ghcr:up` usa `resolve-env.sh` (login en dev; en servidor, `INFISICAL_TOKEN` + `INFISICAL_PROJECT_ID` — con token la CLI ignora `.infisical.yaml`, el resolver pasa `--projectId` si está definido). Evidencia: `docker compose -f docker-compose.yml -f docker-compose.ghcr.yml config` OK; api-user resuelve 21 vars de Infisical (sin fallbacks dev inline).
- T4 · S4 · Workflows de GitHub Actions obtienen secrets sin Doppler · commit: —
  - Verificado 2026-11-22: `grep -rni doppler .github/` → sin resultados; `test.yml` inyecta env de CI inline, `release-ghcr.yml` solo usa `GITHUB_TOKEN`. No había nada que migrar.
- T5 · S5 · Limpieza de referencias residuales a Doppler (Makefile, `scripts/`, Dockerfile, docker-compose, docs) · commit: —
  - Hecho y verificado 2026-11-22: referencias restantes solo en `CHANGELOG.md` (histórico; entrada de migración agregada y mención de profiles actualizada a Infisical) y `.temp/guia-r2-546.md` (gitignored, fuera del repo). Leftovers `DOPPLER_*` en Infisical dev borrados por la persona.

## Log

L1: «Usa la skill kickoff» → selección del issue #531 (Migrar secrets de Doppler a Infisical Cloud) y «dale vamos» autorizando la implementación.
L2: Kickoff completado: board In Progress, rama `feature/531-migrar-secrets-infisical-cloud` desde `origin/develop`, sin upstream.
L3: Inventario Doppler completado (explorer): tres rutas de invocación (`resolve-env.sh`, `docker:rebuild`, `migrate*`), CI ya sin Doppler, sin uso previo de Infisical. Riesgos: fallbacks dev con secrets inline en `docker-compose.ghcr.yml`, `/tmp` plano sin chmod 600 en `docker:rebuild`.
L4: Decisiones humanas: (a) la persona pega la lista de variables de `.env.example`/`.env.production.example` (lectura bloqueada por política de seguridad); (b) CLI de Infisical instalada por el agente vía npm (`@infisical/cli@0.45.14`, Cloudsmith deprecado desde 2026-09-16); (c) proyecto y machine identity en Infisical Cloud los crea la persona por consola web. Entornos Infisical: dev/staging/prod; proyecto api-user (dd3eb71d-1fb6-4fe7-a499-2d6a291a9f10).
L5: T2 implementado y verificado (dev): resolver + Makefile + `.infisical.yaml`; bug corregido: `$(shell case ...)` con paréntesis rompía la expansión de Make, reemplazado por `$(if $(filter ...))`.
L7: Verificación end-to-end por la persona 2026-11-22: `make up` levanta el stack completo (Docker Desktop) con `env ← Infisical (env dev)` y `COMPOSE_PROFILES=storage-s3`; reportado «excelente! levanto todo bien».
L8: Pendientes S1: (a) entorno `prod` de Infisical responde sin JWT_SECRET — parece vacío o incompleto, falta migrar production; (b) comparar los 48 nombres de dev contra `.env.example`/`.env.production.example` (lectura bloqueada por política; la persona pega los nombres); (c) leftovers Doppler migrados a Infisical dev: DOPPLER_CONFIG, DOPPLER_ENVIRONMENT, DOPPLER_PROJECT — eliminarlos.
