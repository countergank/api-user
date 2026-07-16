# Proposal: Environment + Makefile Standardization

## Intent

Eliminate environment configuration drift and provide a unified developer interface. Today: `.env.local` is missing (breaking `docker-redeploy.sh` default), `docker-compose.yml` hardcodes `.env.development` as env_file (ignoring the script's `--env-file` argument), 4 env files have inconsistent variables, and there is no Makefile. Linear COU-118.

## Scope

### In Scope
- Create `.env.local` from `.env.development` with `NODE_ENV=local` (gitignored)
- Fix `docker-compose.yml` to use dynamic `env_file: .env.${NODE_ENV:-development}`
- Create `Makefile` with ~18 targets wrapping existing npm scripts and docker compose
- Fix env var drift: add `CORS_ORIGINS` to `.env.local.testing`, add `JWT_SECRET` + `CORS_ORIGINS` to `.env.production.example`, add audit/logging vars to `.env.example`
- Update `scripts/docker-redeploy.sh` to validate env file exists before proceeding

### Out of Scope
- Production deployment automation (CI/CD pipelines)
- Secrets management tooling (Vault, AWS Secrets Manager, etc.)
- Staging/QA environment files (future iteration)
- Changes to Dockerfile build stages

## Capabilities

> This section is the CONTRACT between proposal and specs phases.

### New Capabilities
- `makefile-devex`: Makefile as unified interface for build/test/deploy/docker operations, with npm scripts as fallback for non-make environments

### Modified Capabilities
- `config-validation`: Env file consistency — all committed env templates must include all 10 required + 33 optional vars with appropriate placeholders or comments

## Approach

Per-environment `.env.*` files (not single-file). Docker Compose uses variable substitution for `env_file` directive. Makefile wraps all npm scripts and docker compose commands. `docker-redeploy.sh` is kept but enhanced with validation — Makefile's `make deploy` wraps it. npm scripts remain functional for developers without `make` (Windows/WSL).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `Makefile` | New | ~18 targets: help, install, build, dev, test, test:cov, test:e2e, lint, format, docker:up, docker:down, docker:logs, deploy, db:drop, seed:all, seed:perms, seed:roles, seed:users, clean |
| `docker-compose.yml` | Modified | Dynamic `env_file`, configurable build target via `TARGET` var |
| `.env.local` | New | Local dev baseline, gitignored |
| `.env.local.testing` | Modified | Add missing `CORS_ORIGINS` |
| `.env.production.example` | Modified | Add missing `JWT_SECRET`, `CORS_ORIGINS` |
| `.env.example` | Modified | Add audit/logging vars, improve documentation |
| `scripts/docker-redeploy.sh` | Modified | Validate env file exists, error messaging |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Docker Compose `${NODE_ENV}` in `env_file` behaves inconsistently across versions | Medium | Test with compose v2 (already in use); fallback to explicit `--env-file` flag |
| Developers without `make` (Windows) lose workflow | Low | npm scripts remain fully functional; Makefile is optional convenience |
| Breaking existing `docker-redeploy.sh` usage | Low | `.env.local` creation fixes the broken default; script gains validation |

## Rollback Plan

1. `rm Makefile`
2. `git checkout docker-compose.yml`
3. `rm .env.local`
4. `git checkout .env.local.testing .env.production.example .env.example scripts/docker-redeploy.sh`

All changes are additive or reversible. No database migrations or data transformations.

## Dependencies

- None external. Docker Compose v2 already in use (confirmed by `docker compose` command in redeploy script).

## Success Criteria

- [ ] `make help` displays all targets with descriptions
- [ ] `make test` runs same suite as `npm test` (exit code matches)
- [ ] `make deploy local` works without errors (creates `.env.local` if missing)
- [ ] `docker compose up` loads correct env file based on `NODE_ENV`
- [ ] All 10 required vars present in `.env.local.testing` and `.env.production.example`
- [ ] `npm test` still works without Makefile installed
