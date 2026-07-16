# ==============================================================================
# api-user Makefile
# ==============================================================================
# Usage: make <target>
#        make help              — show all available targets
#        make up ENV=staging    — start Docker with a specific environment
#        make redeploy ENV=prod — tear down and redeploy a specific environment
# ==============================================================================

ENV ?= development

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

## dev — Start development server (nest start --watch)
dev:
	npm run start:dev

## start — Alias for dev
start: dev

# ==============================================================================
# Docker
# ==============================================================================

## up — Start Docker services (ENV=<env>, auto-detects Doppler)
up:
	@if [ ! -f .env.$(ENV) ] && ! command -v doppler >/dev/null 2>&1; then \
		echo "Error: .env.$(ENV) not found and Doppler not installed"; \
		exit 1; \
	fi
	@if command -v doppler >/dev/null 2>&1; then \
		echo "Using Doppler for environment: $(ENV)"; \
		doppler secrets download --no-file --format=env > /tmp/api-user-env.$(ENV).tmp; \
		NODE_ENV=$(ENV) docker compose --env-file /tmp/api-user-env.$(ENV).tmp up -d --build; \
		status=$$?; rm -f /tmp/api-user-env.$(ENV).tmp; exit $$status; \
	else \
		echo "Using local .env.$(ENV)"; \
		NODE_ENV=$(ENV) docker compose --env-file .env.$(ENV) up -d --build; \
	fi

## down — Stop Docker services (ENV=<env>, auto-detects Doppler)
down:
	@if command -v doppler >/dev/null 2>&1; then \
		echo "Using Doppler for environment: $(ENV)"; \
		doppler secrets download --no-file --format=env > /tmp/api-user-env.$(ENV).tmp; \
		NODE_ENV=$(ENV) docker compose --env-file /tmp/api-user-env.$(ENV).tmp down; \
		status=$$?; rm -f /tmp/api-user-env.$(ENV).tmp; exit $$status; \
	else \
		echo "Using local .env.$(ENV)"; \
		NODE_ENV=$(ENV) docker compose --env-file .env.$(ENV) down 2>/dev/null || \
			docker compose down; \
	fi

## redeploy — Tear down and start Docker services (ENV=<env>)
redeploy:
	@$(MAKE) down ENV=$(ENV) || true
	@$(MAKE) up ENV=$(ENV)

## logs — Follow Docker service logs (ENV=<env>, auto-detects Doppler)
logs:
	@if command -v doppler >/dev/null 2>&1; then \
		doppler secrets download --no-file --format=env > /tmp/api-user-env.$(ENV).tmp; \
		NODE_ENV=$(ENV) docker compose --env-file /tmp/api-user-env.$(ENV).tmp logs -f; \
		status=$$?; rm -f /tmp/api-user-env.$(ENV).tmp; exit $$status; \
	else \
		NODE_ENV=$(ENV) docker compose --env-file .env.$(ENV) logs -f; \
	fi

## docker:rebuild — Rebuild Docker images without cache (ENV=<env>, auto-detects Doppler)
docker\:rebuild:
	@if command -v doppler >/dev/null 2>&1; then \
		doppler secrets download --no-file --format=env > /tmp/api-user-env.$(ENV).tmp; \
		NODE_ENV=$(ENV) docker compose --env-file /tmp/api-user-env.$(ENV).tmp build --no-cache; \
		status=$$?; rm -f /tmp/api-user-env.$(ENV).tmp; exit $$status; \
	else \
		NODE_ENV=$(ENV) docker compose --env-file .env.$(ENV) build --no-cache; \
	fi

# ==============================================================================
# Migrations
# ==============================================================================

## migrate — Run pending migrations (ENV=<env>, auto-detects Doppler)
migrate:
	@if command -v doppler >/dev/null 2>&1; then \
		doppler run -- npx migrate-mongo up; \
	else \
		NODE_ENV=$(ENV) npx migrate-mongo up; \
	fi

## migrate:status — Show migration status (ENV=<env>, auto-detects Doppler)
migrate\:status:
	@if command -v doppler >/dev/null 2>&1; then \
		doppler run -- npx migrate-mongo status; \
	else \
		NODE_ENV=$(ENV) npx migrate-mongo status; \
	fi

## migrate:down — Roll back the last migration (ENV=<env>, auto-detects Doppler)
migrate\:down:
	@if command -v doppler >/dev/null 2>&1; then \
		doppler run -- npx migrate-mongo down; \
	else \
		NODE_ENV=$(ENV) npx migrate-mongo down; \
	fi

## migrate:create — Create a new migration (NAME=<name>)
migrate\:create:
	@if [ -z "$(NAME)" ]; then echo "Usage: make migrate:create NAME=my-migration"; exit 1; fi
	npx migrate-mongo create $(NAME)

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
