# Tasks: Env + Makefile Standardization

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~160 (1 new Makefile ~85 lines, 1 docker-compose 1-line change, 4 env files ~40 lines, redeploy.sh ~30 lines) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | auto-chain |
| Chain strategy | N/A |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: N/A
400-line budget risk: Low

## Phase 1: Makefile Creation

- [x] 1.1 Create `Makefile` at project root with `.PHONY` declaration listing all targets
- [x] 1.2 Add `help` target (default) with auto-generated output via `grep/awk` from `## comment` annotations
- [x] 1.3 Add dependency targets: `install` → `npm ci`
- [x] 1.4 Add build/run targets: `build` → `npm run build`, `dev` → `npm run start:dev`, `start` → alias for `dev`
- [x] 1.5 Add test targets: `test`, `test:unit`, `test:e2e`, `test:cov`, `test:watch` — all wrapping npm scripts
- [x] 1.6 Add lint/format targets: `lint`, `lint:fix`, `format` — wrapping biome via npm
- [x] 1.7 Add docker targets: `docker:up`, `docker:down`, `docker:logs`, `docker:rebuild` — wrapping `docker compose`
- [x] 1.8 Add `deploy` target: validates `ENV` arg, checks `.env.$(ENV)` exists, invokes `scripts/docker-redeploy.sh`
- [x] 1.9 Add database targets: `db:drop`, `seed:all`, `seed:permissions`, `seed:roles`, `seed:users`, `seed:email-templates`
- [x] 1.10 Add `clean` target: `rm -rf dist node_modules coverage`
- [x] 1.11 Verify: `make help` lists all 18+ targets with descriptions; `make` defaults to help

## Phase 2: Docker Compose Dynamic Env

- [x] 2.1 Change `docker-compose.yml` line 35: `env_file: - .env.development` → `env_file: - .env.$${NODE_ENV:-development}`
- [x] 2.2 Verify: `NODE_ENV=development docker compose config` shows `.env.development` resolved
- [x] 2.3 Verify: `NODE_ENV=production docker compose config` shows `.env.production` resolved

## Phase 3: Env File Fixes

- [x] 3.1 Create `.env.local`: copy `.env.development`, set `NODE_ENV=local`, add audit/logging vars (gitignored)
- [x] 3.2 Fix `.env.local.testing`: add `CORS_ORIGINS=http://localhost:3000`, audit vars (`AUDIT_ENABLED`, `AUDIT_RETENTION_DAYS`, `AUDIT_LEVEL`), `LOG_LEVEL`
- [x] 3.3 Fix `.env.production.example`: add `JWT_SECRET=` placeholder, `CORS_ORIGINS=` placeholder, audit vars, `LOG_LEVEL`
- [x] 3.4 Fix `.env.example`: add audit/logging section (`AUDIT_ENABLED`, `AUDIT_RETENTION_DAYS`, `AUDIT_LEVEL`, `LOG_LEVEL`) as optional commented vars
- [x] 3.5 Verify: `grep` all committed env files — no real secrets, placeholders only; all 10 required vars present in each

## Phase 4: Script Enhancement + Verification

- [x] 4.1 Rewrite `scripts/docker-redeploy.sh`: add `set -euo pipefail`, env file existence validation, docker compose v2 detection with v1 fallback warning, clear error messages
- [x] 4.2 Run `npm test` — all 359+ tests pass with zero failures
- [x] 4.3 Run `npx tsc --noEmit` — zero TypeScript errors
- [x] 4.4 Verify `make help` output matches spec; cross-check env files against `src/config/env.validation.ts` required vars

## Work-Unit Commits

1. `feat(make): add Makefile with 18 dev targets wrapping npm scripts`
2. `fix(docker): dynamic env_file based on NODE_ENV in docker-compose`
3. `chore(env): create .env.local, fix env var drift across all env files`
4. `fix(scripts): validate env file existence in docker-redeploy.sh`
