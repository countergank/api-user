# ==============================================================================
# api-user Makefile
# ==============================================================================
# Usage: make <target>
#        make help              — show all available targets
#        make up ENV=staging    — start Docker with a specific environment
#        make redeploy ENV=prod — tear down and redeploy a specific environment
# ==============================================================================

ENV ?= development
SHELL := /bin/bash

# Env del repo → slug de entorno en Infisical (development→dev; staging y prod
# ya coinciden). Lo consumen dev, migrate* y scripts/resolve-env.sh.
INFISICAL_ENV = $(if $(filter development,$(ENV)),dev,$(ENV))

# ==============================================================================
# Default target
# ==============================================================================

## help — Show this help message
help:
	@echo "api-user — available targets:"
	@echo ""
	@grep -E '^## ' $(MAKEFILE_LIST) | \
		sed 's/^## //' | \
		awk -F ' — ' '{printf "  \033[36m%-22s\033[0m%s\n", $$1, $$2}' | \
		sort
	@echo ""

# ==============================================================================
# Dependencies
# ==============================================================================

## install — Install dependencies (npm ci)
install:
	npm ci

# ==============================================================================
# Build & Run
# ==============================================================================

## build — Build the project (nest build)
build:
	npm run build

## dev — Start development server (nest start --watch, secretos de Infisical)
## Sin CLI de Infisical arranca igual y la app lee .env.<env> como siempre.
dev:
	@if command -v infisical >/dev/null 2>&1; then \
		infisical secrets-manager run --env=$(INFISICAL_ENV) -- npm run start:dev; \
	else \
		npm run start:dev; \
	fi

## start — Alias for dev
start: dev

# ==============================================================================
# Docker
# ==============================================================================

## up — Start Docker services (ENV=<env>, Infisical si tiene secretos, si no .env.<env>)
## COU-312 + #548: el env resuelto entra al contenedor como `env_file`, pero
## COMPOSE_PROFILES la lee el propio proceso de compose: sin este puente, la
## variable definida en Infisical nunca activa los perfiles (minio, mailpit).
## Precedencia: si el env resuelto no define COMPOSE_PROFILES, se respeta la
## que el shell del invocador ya tenga exportada (comportamiento previo).
up:
	@set -e; \
	file=$$(scripts/resolve-env.sh "$(ENV)"); \
	profiles=$$(sed -n 's/^[[:space:]]*COMPOSE_PROFILES[[:space:]]*=[[:space:]]*//p' "$$file" | tail -1 | tr -d "\"'[:space:]\r"); \
	trap 'case "$$file" in */api-user-env.*/*) rm -rf "$${file%/*}" ;; esac' EXIT; \
	profiles="$${profiles:-$${COMPOSE_PROFILES:-}}"; \
	echo "[env] compose profiles activos: $${profiles:-ninguno (solo stack base)}"; \
	COMPOSE_PROFILES="$$profiles" NODE_ENV=$(ENV) ENV_FILE="$$file" docker compose up -d --build

## down — Stop Docker services for this project
down:
	@docker compose down

## redeploy — Tear down and start Docker services (ENV=<env>)
redeploy:
	@$(MAKE) down ENV=$(ENV) || true
	@$(MAKE) up ENV=$(ENV)

## logs — Follow Docker service logs
logs:
	@docker compose logs -f

## ghcr:up — Start stack with GHCR image (VERSION=<version>, ENV=<env>)
## Mismo resolver que `up`: login de la CLI en la máquina de desarrollo, o
## machine identity en un servidor (INFISICAL_TOKEN + INFISICAL_PROJECT_ID).
ghcr\:up:
	@set -e; \
	file=$$(scripts/resolve-env.sh "$(ENV)"); \
	case "$$file" in */api-user-env.*/*) trap 'rm -rf "$${file%/*}"' EXIT;; esac; \
	VERSION=$(VERSION) ENV_FILE="$$file" docker compose -f docker-compose.yml -f docker-compose.ghcr.yml --env-file "$$file" up -d --no-build
	@echo "GHCR image ghcr.io/countergank/api-user:v$(VERSION) started"

## ghcr:down — Stop GHCR stack
ghcr\:down:
	VERSION=$(VERSION) docker compose -f docker-compose.yml -f docker-compose.ghcr.yml down

## ghcr:test — Test GHCR image with full stack (VERSION=<version>)
ghcr\:test:
	@$(MAKE) ghcr\:up VERSION=$(VERSION)
	@sleep 10
	@echo "--- Health Check ---"
	@curl -s http://localhost:3000/health | python3 -m json.tool
	@echo ""
	@echo "--- Root ---"
	@curl -s http://localhost:3000/ | python3 -m json.tool
	@echo ""
	@echo "--- Endpoints ---"
	@curl -s http://localhost:3000/ | head -1
	@echo ""

## docker:rebuild — Rebuild Docker images without cache (ENV=<env>, env de scripts/resolve-env.sh)
docker\:rebuild:
	@set -e; \
	file=$$(scripts/resolve-env.sh "$(ENV)"); \
	case "$$file" in */api-user-env.*/*) trap 'rm -rf "$${file%/*}"' EXIT;; esac; \
	NODE_ENV=$(ENV) ENV_FILE="$$file" docker compose --env-file "$$file" build --no-cache

# ==============================================================================
# Migrations
# ==============================================================================

## migrate — Run pending migrations (ENV=<env>, secretos de Infisical)
migrate:
	@if command -v infisical >/dev/null 2>&1; then \
		infisical secrets-manager run --env=$(INFISICAL_ENV) --command 'env MONGODB_MIGRATE_URI="mongodb://$$DATABASE_USER:$$DATABASE_PASSWORD@localhost:$$DATABASE_PORT/$$DATABASE_NAME?authSource=admin" npx migrate-mongo up -f .migraterc.js'; \
	else \
		set -a && . .env.$(ENV) && set +a && \
		MONGODB_MIGRATE_URI="mongodb://$$DATABASE_USER:$$DATABASE_PASSWORD@localhost:$$DATABASE_PORT/$$DATABASE_NAME?authSource=admin" npx migrate-mongo up -f .migraterc.js; \
	fi

## migrate:status — Show migration status (ENV=<env>, secretos de Infisical)
migrate\:status:
	@if command -v infisical >/dev/null 2>&1; then \
		infisical secrets-manager run --env=$(INFISICAL_ENV) --command 'env MONGODB_MIGRATE_URI="mongodb://$$DATABASE_USER:$$DATABASE_PASSWORD@localhost:$$DATABASE_PORT/$$DATABASE_NAME?authSource=admin" npx migrate-mongo status -f .migraterc.js'; \
	else \
		set -a && . .env.$(ENV) && set +a && \
		MONGODB_MIGRATE_URI="mongodb://$$DATABASE_USER:$$DATABASE_PASSWORD@localhost:$$DATABASE_PORT/$$DATABASE_NAME?authSource=admin" npx migrate-mongo status -f .migraterc.js; \
	fi

## migrate:down — Roll back the last migration (ENV=<env>, secretos de Infisical)
migrate\:down:
	@if command -v infisical >/dev/null 2>&1; then \
		infisical secrets-manager run --env=$(INFISICAL_ENV) --command 'env MONGODB_MIGRATE_URI="mongodb://$$DATABASE_USER:$$DATABASE_PASSWORD@localhost:$$DATABASE_PORT/$$DATABASE_NAME?authSource=admin" npx migrate-mongo down -f .migraterc.js'; \
	else \
		set -a && . .env.$(ENV) && set +a && \
		MONGODB_MIGRATE_URI="mongodb://$$DATABASE_USER:$$DATABASE_PASSWORD@localhost:$$DATABASE_PORT/$$DATABASE_NAME?authSource=admin" npx migrate-mongo down -f .migraterc.js; \
	fi

## migrate:create — Create a new migration (NAME=<name>)
migrate\:create:
	@if [ -z "$(NAME)" ]; then echo "Usage: make migrate:create NAME=my-migration"; exit 1; fi
	npx migrate-mongo create -f .migraterc.js $(NAME)

# ==============================================================================
# Testing
# ==============================================================================

## test — Run all tests (jest)
test:
	npm test

## test:unit — Run unit tests only (*.spec.ts)
test\:unit:
	npm run test:unit

## test:e2e — Run end-to-end tests
test\:e2e:
	npm run test:e2e

## test:cov — Run tests with coverage report
test\:cov:
	npm run test:cov

## test:watch — Run tests in watch mode
test\:watch:
	npm run test:watch

# ==============================================================================
# Lint & Format
# ==============================================================================

## lint — Lint source code (biome)
lint:
	npx biome lint --diagnostic-level=error ./src

## lint:fix — Lint and auto-fix issues (biome)
lint\:fix:
	npx biome lint --fix ./src

## format — Format source code (biome)
format:
	npx biome format --fix ./src

# ==============================================================================
# Database
# ==============================================================================

## db:drop — Drop the MongoDB database (docker exec)
db\:drop:
	docker exec db-user mongosh --quiet --eval 'db.getSiblingDB("api_user").dropDatabase()'

## seed:all — Run all database seeds
seed\:all:
	npm run seed:all

## seed:permissions — Seed permissions
seed\:permissions:
	npm run seed:permissions

## seed:roles — Seed roles
seed\:roles:
	npm run seed:roles

## seed:users — Seed users
seed\:users:
	npm run seed:users

## seed:email-templates — Seed email templates
seed\:email-templates:
	npm run seed:email-templates

# ==============================================================================
# Cleanup
# ==============================================================================

## clean — Remove dist, node_modules, and coverage
clean:
	rm -rf dist node_modules coverage

.PHONY: help install build dev start \
	up down redeploy logs docker\:rebuild \
	migrate migrate\:status migrate\:down migrate\:create \
	test test\:unit test\:e2e test\:cov test\:watch \
	lint lint\:fix format \
	db\:drop seed\:all seed\:permissions seed\:roles seed\:users seed\:email-templates \
	clean
