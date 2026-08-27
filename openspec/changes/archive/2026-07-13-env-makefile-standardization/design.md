# Design: Environment + Makefile Standardization

## Technical Approach

Create a Makefile as the unified developer interface wrapping existing npm scripts and docker-compose operations. Fix docker-compose.yml to use dynamic env_file via variable substitution. Create the missing `.env.local` file. Synchronize all env templates against `env.validation.ts` (the source of truth with 10 required + 33 optional vars). Enhance `docker-redeploy.sh` with validation. npm scripts remain fully functional as fallback for non-make environments.

## Architecture Decisions

### Decision: Dynamic env_file in docker-compose

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `env_file: .env.${NODE_ENV:-development}` | Compose v2 supports `${VAR}` in env_file. Clean but requires NODE_ENV set. | **Chosen** |
| `--env-file` CLI flag | Only affects interpolation, NOT the env_file directive (current bug). | Rejected |
| Multiple compose override files | Overkill for single env_file change. | Rejected |

**Rationale**: Docker Compose v2 (already confirmed in use by `docker-redeploy.sh`) supports `${VAR:-default}` substitution in the `env_file` directive. This is the cleanest fix — one line change, no script changes needed for compose itself.

### Decision: Makefile target naming convention

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Colon-separated (`test:cov`) | Matches existing npm scripts exactly. Make treats `:` as part of target name. | **Chosen** |
| Hyphen-separated (`test-cov`) | More "make-native" but breaks 1:1 mapping with npm scripts. | Rejected |

**Rationale**: Keeping `test:cov` naming maintains a direct mental mapping between `make test:cov` and `npm run test:cov`. This reduces cognitive load and makes the Makefile self-documenting.

### Decision: `make help` auto-generation

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Auto-parse `## comment` with awk/grep | Self-documenting, stays in sync with targets. Standard Makefile pattern. | **Chosen** |
| Manual help target | Requires manual sync, easy to drift. | Rejected |

**Rationale**: The `grep/awk` pattern for `## target: description` comments is a well-established Makefile convention. It ensures help output never drifts from actual targets.

### Decision: `.env.local` creation strategy

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Copy from `.env.development`, change NODE_ENV | Preserves all existing dev values, minimal diff. | **Chosen** |
| Create minimal from scratch | Risk of missing vars that development has. | Rejected |

**Rationale**: `.env.development` is the most complete env file. Copying it and changing `NODE_ENV=local` ensures parity. The file is gitignored so it's per-developer.

### Decision: docker-redeploy.sh lifecycle

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Keep + enhance with validation | Preserves existing workflow, adds safety. `make deploy` wraps it. | **Chosen** |
| Replace entirely with `make deploy` | Breaks existing scripts/CI that call redeploy.sh directly. | Rejected |

**Rationale**: The script is already referenced in existing workflows. Enhancing it with validation (env file existence check) is safer than replacing it. The Makefile's `deploy` target calls the script, creating a single entry point.

### Decision: Windows compatibility

| Option | Tradeoff | Decision |
|--------|----------|----------|
| npm scripts as documented fallback | No extra tooling needed. All npm scripts already work. | **Chosen** |
| Provide `.bat`/`.ps1` equivalents | Maintenance burden, platform divergence. | Rejected |

**Rationale**: npm scripts are already fully functional and platform-agnostic. The Makefile help target will document the npm script equivalents. Windows developers use `npm test`, `npm run build`, etc. directly.

## Data Flow

### Environment loading chain

    Makefile target
         │
         ▼
    npm script  ──→  NestJS app  ──→  @nestjs/config
         │                  │              │
         │                  │              ▼
         │                  │         env.validation.ts
         │                  │         (10 required + 33 optional)
         │                  │
         ▼                  ▼
    docker-compose ──→  .env.${NODE_ENV:-development}
         │
         ▼
    Container env vars injected at runtime

### Deploy flow

    make deploy [env]
         │
         ▼
    scripts/docker-redeploy.sh [env]
         │
         ├── validate: .env.[env] exists?
         │    └── NO → exit 1 with message
         │    └── YES → continue
         │
         ├── docker compose --env-file .env.[env] down
         │
         └── docker compose --env-file .env.[env] up -d -V --build

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `Makefile` | Create | ~18 targets with auto-generated help, wrapping npm scripts and docker-compose |
| `.env.local` | Create | Copy of `.env.development` with `NODE_ENV=local` (gitignored) |
| `docker-compose.yml` | Modify | Change `env_file: .env.development` → `env_file: .env.${NODE_ENV:-development}`; add `TARGET` build arg |
| `.env.local.testing` | Modify | Add missing `CORS_ORIGINS`, `JWT_SECRET`, audit/logging vars |
| `.env.production.example` | Modify | Add missing `JWT_SECRET`, `CORS_ORIGINS`, audit/logging vars |
| `.env.example` | Modify | Add audit/logging vars (`AUDIT_*`, `LOG_LEVEL`) |
| `scripts/docker-redeploy.sh` | Modify | Add env file existence validation, improve error messages, require compose v2 |

## Makefile Target Design

```makefile
.PHONY: help install build dev start test test:unit test:e2e test:cov test:watch lint lint:fix format docker:up docker:down docker:logs docker:rebuild deploy db:drop seed:all seed:permissions seed:roles seed:users seed:email-templates clean

# Default target
help: ## Show this help
	@grep -E '^[a-zA-Z0-9_:%-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| sort \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-25s\033[0m %s\n", $$1, $$2}'

# ── Dependencies ──────────────────────────────────────────────
install: ## Install dependencies (npm ci)
	npm ci

# ── Build & Run ───────────────────────────────────────────────
build: ## Build the project
	npm run build

dev: ## Start development server with watch
	npm run start:dev

start: ## Start development server (alias for dev)
	npm run start:dev

# ── Testing ───────────────────────────────────────────────────
test: ## Run all tests
	npm test

test:unit: ## Run unit tests only
	npm run test:unit

test:e2e: ## Run e2e tests only
	npm run test:e2e

test:cov: ## Run tests with coverage
	npm run test:cov

test:watch: ## Run tests in watch mode
	npm run test:watch

# ── Linting & Formatting ─────────────────────────────────────
lint: ## Run linter
	npm run lint

lint:fix: ## Run linter with auto-fix
	npm run lint:fix

format: ## Format code with Biome
	npm run format

# ── Docker ────────────────────────────────────────────────────
docker:up: ## Start docker compose services
	docker compose up -d

docker:down: ## Stop docker compose services
	docker compose down

docker:logs: ## Follow docker compose logs
	docker compose logs -f

docker:rebuild: ## Rebuild docker compose services
	docker compose up -d --build

# ── Deployment ────────────────────────────────────────────────
deploy: ## Deploy with docker (usage: make deploy [env=local])
	@./scripts/docker-redeploy.sh $(env)

# ── Database ──────────────────────────────────────────────────
db:drop: ## Drop the api_user database
	npm run db:drop

# ── Seeding ───────────────────────────────────────────────────
seed:all: ## Run all seeds
	npm run seed:all

seed:permissions: ## Seed permissions
	npm run seed:permissions

seed:roles: ## Seed roles
	npm run seed:roles

seed:users: ## Seed users
	npm run seed:users

seed:email-templates: ## Seed email templates
	npm run seed:email-templates

# ── Cleanup ───────────────────────────────────────────────────
clean: ## Remove dist, node_modules, coverage
	rm -rf dist node_modules coverage
```

## Docker-Compose Changes

### Before

```yaml
    env_file:
      - .env.development
```

### After

```yaml
    env_file:
      - .env.${NODE_ENV:-development}
```

This single change makes the `--env-file` flag in `docker-redeploy.sh` work correctly — the script passes `--env-file .env.local` which sets `NODE_ENV` for interpolation, and the compose file now uses that variable to select the env file.

## Env File Consistency Matrix

Based on `env.validation.ts` source of truth:

| Variable | Required | .env.development | .env.local (new) | .env.local.testing | .env.example | .env.production.example |
|----------|----------|------------------|------------------|--------------------|--------------|------------------------|
| NODE_ENV | ✅ | development | local | development | development | production |
| VERSION | ✅ | 1.0.0 | 1.0.0 | 1.0.0 | 1.0.0 | (empty) |
| HOST | ✅ | 0.0.0.0 | 0.0.0.0 | 0.0.0.0 | 0.0.0.0 | 0.0.0.0 |
| PORT | ✅ | 3000 | 3000 | 3000 | 3000 | 3000 |
| DATABASE_USER | ✅ | dev_user | dev_user | test_user | your_db_user | (empty) |
| DATABASE_PASSWORD | ✅ | dev_password | dev_password | test_password | your_db_password | (empty) |
| DATABASE_HOST | ✅ | db-user | db-user | localhost | localhost | (empty) |
| DATABASE_PORT | ✅ | 27017 | 27017 | 27017 | 27017 | 27017 |
| DATABASE_NAME | ✅ | api_user | api_user | api_user_test | api_user | api_user |
| ENCRYPTION_PASSWORD | ✅ | (32ch) | (32ch) | (32ch) | (placeholder) | (empty) |
| JWT_SECRET | ✅ | (set) | (set) | (set) | (empty) | **ADD** |
| CORS_ORIGINS | ✅ | (set) | (set) | **ADD** | (set) | **ADD** |
| AUDIT_ENABLED | optional | **ADD** | **ADD** | **ADD** | **ADD** | **ADD** |
| AUDIT_RETENTION_DAYS | optional | **ADD** | **ADD** | **ADD** | **ADD** | **ADD** |
| AUDIT_LEVEL | optional | **ADD** | **ADD** | **ADD** | **ADD** | **ADD** |
| LOG_LEVEL | optional | **ADD** | **ADD** | **ADD** | **ADD** | **ADD** |

**Key fixes:**
- `.env.local.testing`: Add `CORS_ORIGINS`, `JWT_SECRET`, audit vars, `LOG_LEVEL`
- `.env.production.example`: Add `JWT_SECRET`, `CORS_ORIGINS`, audit vars, `LOG_LEVEL`
- `.env.example`: Add audit vars, `LOG_LEVEL`
- `.env.local`: Copy from `.env.development`, set `NODE_ENV=local`

## docker-redeploy.sh Changes

```bash
#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/docker-redeploy.sh [env]
# Default: local

ENV="${1:-local}"
ENV_FILE=".env.${ENV}"

# Validate env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: Environment file '$ENV_FILE' not found."
    echo "Create it from .env.example or .env.development before deploying."
    exit 1
fi

# Validate docker compose is available
if ! command -v docker &>/dev/null; then
    echo "ERROR: docker is not installed."
    exit 1
fi

if docker compose version &>/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &>/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
    echo "WARNING: docker-compose v1 is deprecated. Install docker compose plugin."
else
    echo "ERROR: docker compose plugin or docker-compose is not installed."
    exit 1
fi

echo "Deploying with environment: $ENV ($ENV_FILE)"
$COMPOSE_CMD --env-file "$ENV_FILE" down
$COMPOSE_CMD --env-file "$ENV_FILE" up -d -V --build
echo "Deployment complete."
```

**Changes from current:**
1. `set -euo pipefail` for strict error handling
2. Env file existence validation before any docker commands
3. Docker compose availability check (v2 preferred, v1 warning)
4. Clear error messages with actionable guidance
5. Progress output for deployment steps

## Testing Strategy

This is infrastructure/configuration change — no unit tests. Validation is done via execution commands:

| Validation | Command | Expected |
|-----------|---------|----------|
| Makefile help | `make help` | Lists all targets with descriptions |
| Test parity | `make test` vs `npm test` | Same exit code, same test count |
| Coverage parity | `make test:cov` vs `npm run test:cov` | Same coverage report |
| Docker compose env loading | `NODE_ENV=local docker compose config` | Shows `.env.local` resolved |
| Env file validation | `./scripts/docker-redeploy.sh nonexistent` | Exit 1, error message |
| Deploy local | `make deploy env=local` | Containers start without errors |
| npm fallback | `npm test` (no Makefile) | Works identically |
| Env var completeness | `grep -c` required vars in each file | All 10 required present |

## Migration / Rollout

No migration needed. All changes are additive or reversible:

1. `.env.local` is new and gitignored — no impact on existing developers
2. `docker-compose.yml` change uses default `development` — existing behavior preserved
3. `Makefile` is optional — npm scripts continue to work
4. Env file additions are comments/placeholders — no runtime behavior change

### Rollback
```bash
rm Makefile
git checkout docker-compose.yml
rm .env.local
git checkout .env.local.testing .env.production.example .env.example scripts/docker-redeploy.sh
```

## Open Questions

- [ ] None — all design decisions resolved.
