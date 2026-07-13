# ==============================================================================
# api-user Makefile
# ==============================================================================
# Usage: make <target>
#        make help              — show all available targets
#        make up ENV=staging    — start Docker with a specific environment
#        make deploy ENV=prod   — deploy a specific environment
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

## up — Start Docker services (ENV=<env>, default: development)
up:
	@if [ ! -f .env.$(ENV) ]; then \
		echo "Error: .env.$(ENV) not found. Create it or use ENV=<existing-env>"; \
		exit 1; \
	fi
	NODE_ENV=$(ENV) docker compose up -d --build

## down — Stop Docker services
down:
	docker compose down

## logs — Follow Docker service logs
logs:
	docker compose logs -f

## docker:rebuild — Rebuild Docker images without cache
docker\:rebuild:
	docker compose build --no-cache

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
# Deploy
# ==============================================================================

## deploy — Deploy via docker-redeploy.sh (ENV=<env>, default: development)
deploy:
	@if [ ! -f .env.$(ENV) ]; then \
		echo "Error: .env.$(ENV) not found. Cannot deploy without env file."; \
		exit 1; \
	fi
	bash scripts/docker-redeploy.sh $(ENV)

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

.PHONY: help install build dev start up down logs docker\:rebuild \
	test test\:unit test\:e2e test\:cov test\:watch \
	lint lint\:fix format \
	deploy \
	db\:drop seed\:all seed\:permissions seed\:roles seed\:users seed\:email-templates \
	clean
