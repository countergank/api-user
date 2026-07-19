# Makefile Developer Experience Specification

## Purpose

Provide a unified command-line interface for all common development operations through a Makefile, wrapping npm scripts and Docker Compose commands. The Makefile serves as the primary developer interface while keeping npm scripts functional as fallback for non-make environments.

## Requirements

### Requirement: MF-01 — Makefile Existence and Target Coverage

A `Makefile` MUST exist in the project root with targets for all common development operations.

The Makefile SHALL provide targets for: `help`, `install`, `dev`, `up`, `down`, `test`, `test:cov`, `test:e2e`, `lint`, `format`, `seed`, `clean`, `build`, `deploy`.

#### Scenario: Makefile exists with all required targets

- GIVEN the project root directory
- WHEN listing Makefile targets
- THEN a `Makefile` exists with targets for help, install, dev, up, down, test, test:cov, test:e2e, lint, format, seed, clean, build, deploy

#### Scenario: All targets are documented

- GIVEN the Makefile exists
- WHEN running `make help`
- THEN all targets appear in the help output with descriptions

---

### Requirement: MF-02 — Help Target Documentation

The `make help` target MUST list all available targets with human-readable descriptions.

Each target description SHALL explain what the target does in one line.

#### Scenario: Help displays all targets

- GIVEN the Makefile exists
- WHEN executing `make help`
- THEN the output lists all targets (help, install, dev, up, down, test, test:cov, test:e2e, lint, format, seed, clean, build, deploy)
- AND each target has a one-line description

#### Scenario: Help target is the default

- GIVEN the Makefile exists
- WHEN executing `make` without arguments
- THEN the help target executes (displays available targets)

---

### Requirement: MF-03 — Thin Wrapper Pattern

Makefile targets MUST be thin wrappers around npm scripts.

npm scripts SHALL remain the source of truth for build/test/deploy logic. The Makefile SHALL delegate to npm scripts, not duplicate their logic.

#### Scenario: Makefile delegates to npm scripts

- GIVEN the Makefile exists
- WHEN inspecting the `test` target implementation
- THEN the target executes `npm test` (not inline test commands)

#### Scenario: npm scripts work independently

- GIVEN the Makefile exists
- WHEN executing `npm test` directly (without make)
- THEN the test suite runs successfully (exit code 0 or appropriate failure code)

---

### Requirement: MF-04 — Docker Up with Environment Argument

The `make up` target MUST start Docker services with the specified environment.

The target SHALL accept an `ENV` argument (e.g., `make up ENV=production`). If no `ENV` is provided, it SHALL default to `development`.

#### Scenario: Docker up with explicit environment

- GIVEN the Makefile exists
- WHEN executing `make up ENV=staging`
- THEN Docker Compose starts with `.env.staging` as the environment file

#### Scenario: Docker up defaults to development

- GIVEN the Makefile exists
- WHEN executing `make up` without ENV argument
- THEN Docker Compose starts with `.env.development` as the environment file

#### Scenario: Docker up fails gracefully for missing env file

- GIVEN the Makefile exists
- WHEN executing `make up ENV=nonexistent`
- AND `.env.nonexistent` does not exist
- THEN the command fails with a clear error message indicating the missing env file

---

### Requirement: MF-05 — Docker Down Target

The `make down` target MUST stop all Docker services.

The target SHALL execute `docker compose down` to stop and remove containers, networks, and volumes.

#### Scenario: Docker down stops all services

- GIVEN Docker services are running
- WHEN executing `make down`
- THEN all containers, networks, and volumes defined in docker-compose.yml are stopped and removed

#### Scenario: Docker down is idempotent

- GIVEN no Docker services are running
- WHEN executing `make down`
- THEN the command succeeds without error (no-op)

---

### Requirement: MF-06 — Deploy Target with Environment Validation

The `make deploy` target MUST run the redeploy script with environment validation.

The target SHALL accept an `ENV` argument and pass it to `scripts/docker-redeploy.sh`. The target SHALL validate that the corresponding `.env.${ENV}` file exists before invoking the script.

#### Scenario: Deploy with valid environment

- GIVEN the Makefile exists
- AND `.env.production` exists
- WHEN executing `make deploy ENV=production`
- THEN `scripts/docker-redeploy.sh` is invoked with `ENV=production`

#### Scenario: Deploy fails for missing env file

- GIVEN the Makefile exists
- AND `.env.staging` does not exist
- WHEN executing `make deploy ENV=staging`
- THEN the command fails with a clear error message indicating `.env.staging` is missing
- AND `scripts/docker-redeploy.sh` is NOT invoked

---

## Edge Cases

### Edge Case: Make up without ENV argument

- GIVEN the Makefile exists
- WHEN executing `make up` (no ENV argument)
- THEN the target defaults to `ENV=development`
- AND Docker Compose starts with `.env.development`

### Edge Case: Make up with non-existent environment

- GIVEN the Makefile exists
- AND `.env.custom` does not exist
- WHEN executing `make up ENV=custom`
- THEN the command fails with error: "Environment file .env.custom not found"
- AND Docker Compose does NOT start

### Edge Case: Docker Compose variable substitution with dynamic env_file

- GIVEN `docker-compose.yml` uses `env_file: .env.${NODE_ENV:-development}`
- WHEN running `docker compose up` without `NODE_ENV` set
- THEN Docker Compose uses `.env.development` as the env file
- AND variable substitution resolves correctly (Compose v2 behavior)
