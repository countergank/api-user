# Environment Consistency Specification

## Purpose

Ensure all environment configuration files are consistent, complete, and correctly referenced. Eliminate environment variable drift across `.env.*` files and ensure Docker Compose uses dynamic environment file selection.

## Requirements

### Requirement: ENV-01 — Dynamic Environment File in Docker Compose

The `docker-compose.yml` MUST use dynamic `env_file` directive based on `NODE_ENV`.

The `env_file` directive SHALL be `.env.${NODE_ENV:-development}` (not hardcoded to `.env.development`). This allows the same compose file to work across environments.

#### Scenario: Docker Compose uses NODE_ENV for env_file

- GIVEN `docker-compose.yml` exists
- WHEN `NODE_ENV=production` is set
- AND `docker compose up` is executed
- THEN Docker Compose loads `.env.production` as the environment file

#### Scenario: Docker Compose defaults to development

- GIVEN `docker-compose.yml` exists
- WHEN `NODE_ENV` is not set
- AND `docker compose up` is executed
- THEN Docker Compose loads `.env.development` as the environment file (default)

#### Scenario: Dynamic env_file with --env-file flag

- GIVEN `docker-compose.yml` uses `env_file: .env.${NODE_ENV:-development}`
- WHEN running `docker compose --env-file .env.staging up`
- THEN the `--env-file` flag affects variable substitution in the compose file
- AND the service loads `.env.staging` (from NODE_ENV in that file or explicit override)

---

### Requirement: ENV-02 — Local Environment File Existence

A `.env.local` file MUST exist with all required environment variables.

The file SHALL set `NODE_ENV=local` and include all variables required by `src/config/env.validation.ts`. This file is gitignored.

#### Scenario: .env.local exists with NODE_ENV=local

- GIVEN the project root
- WHEN checking for `.env.local`
- THEN the file exists
- AND contains `NODE_ENV=local`

#### Scenario: .env.local includes all required vars

- GIVEN `.env.local` exists
- WHEN inspecting its contents
- THEN all 10 required variables from `src/config/env.validation.ts` are present
- AND all variables have valid placeholder values

---

### Requirement: ENV-03 — Local Testing Environment Completeness

The `.env.local.testing` file MUST include all required environment variables.

The file SHALL include `CORS_ORIGINS` (currently missing) and all other required variables.

#### Scenario: .env.local.testing includes CORS_ORIGINS

- GIVEN `.env.local.testing` exists
- WHEN inspecting its contents
- THEN `CORS_ORIGINS` is present with a valid placeholder value

#### Scenario: .env.local.testing includes all required vars

- GIVEN `.env.local.testing` exists
- WHEN comparing against `src/config/env.validation.ts`
- THEN all 10 required variables are present
- AND no required variables are missing

---

### Requirement: ENV-04 — Production Example Completeness

The `.env.production.example` file MUST include all required environment variables.

The file SHALL include `JWT_SECRET` and `CORS_ORIGINS` (currently missing) with placeholder values.

#### Scenario: .env.production.example includes JWT_SECRET

- GIVEN `.env.production.example` exists
- WHEN inspecting its contents
- THEN `JWT_SECRET` is present with a placeholder value (e.g., `JWT_SECRET=your-secret-key`)

#### Scenario: .env.production.example includes CORS_ORIGINS

- GIVEN `.env.production.example` exists
- WHEN inspecting its contents
- THEN `CORS_ORIGINS` is present with a placeholder value

#### Scenario: .env.production.example includes all required vars

- GIVEN `.env.production.example` exists
- WHEN comparing against `src/config/env.validation.ts`
- THEN all 10 required variables are present
- AND all variables have placeholder values (no real secrets)

---

### Requirement: ENV-05 — Environment Schema Documentation

The `.env.example` file MUST document all required AND optional environment variables.

The file SHALL serve as the schema reference, including comments explaining each variable's purpose. Audit and logging variables MUST be included.

#### Scenario: .env.example includes audit/logging vars

- GIVEN `.env.example` exists
- WHEN inspecting its contents
- THEN audit-related variables (e.g., `AUDIT_LOG_ENABLED`) are present
- AND logging-related variables (e.g., `LOG_LEVEL`) are present

#### Scenario: .env.example documents all required vars

- GIVEN `.env.example` exists
- WHEN comparing against `src/config/env.validation.ts`
- THEN all 10 required variables are present
- AND all 33 optional variables are present
- AND each variable has a comment explaining its purpose

#### Scenario: .env.example has no real secrets

- GIVEN `.env.example` exists
- WHEN inspecting its contents
- THEN all sensitive variables (JWT_SECRET, DATABASE_PASSWORD, etc.) have placeholder values
- AND no real secrets are present

---

### Requirement: ENV-06 — Deploy Script Environment Validation

The `scripts/docker-redeploy.sh` script MUST validate that the environment file exists before proceeding.

The script SHALL check for `.env.${NODE_ENV}` existence and exit with a clear error if missing.

#### Scenario: Deploy script validates env file exists

- GIVEN `scripts/docker-redeploy.sh` exists
- WHEN executing with `NODE_ENV=staging`
- AND `.env.staging` does not exist
- THEN the script exits with error code 1
- AND outputs error message: "Environment file .env.staging not found"
- AND Docker Compose is NOT invoked

#### Scenario: Deploy script proceeds with valid env file

- GIVEN `scripts/docker-redeploy.sh` exists
- WHEN executing with `NODE_ENV=production`
- AND `.env.production` exists
- THEN the script proceeds to invoke Docker Compose

---

### Requirement: ENV-07 — No Real Secrets in Committed Files

All committed `.env.*` files MUST NOT contain real secrets.

Committed files (`.env.example`, `.env.local.testing`, `.env.production.example`, `.env.development`) SHALL only contain placeholder values. `.env.local` is gitignored and MAY contain real values for local development.

#### Scenario: Committed env files have placeholders only

- GIVEN the git repository
- WHEN inspecting committed `.env.*` files (`.env.example`, `.env.local.testing`, `.env.production.example`, `.env.development`)
- THEN all sensitive variables have placeholder values (e.g., `JWT_SECRET=change-me-in-production`)
- AND no real secrets (API keys, passwords, tokens) are present

#### Scenario: .env.local is gitignored

- GIVEN the `.gitignore` file
- WHEN inspecting its contents
- THEN `.env.local` is listed (or matched by a pattern like `.env.*`)
- AND `.env.local` is NOT tracked by git

---

## Edge Cases

### Edge Case: Docker Compose variable substitution with missing NODE_ENV

- GIVEN `docker-compose.yml` uses `env_file: .env.${NODE_ENV:-development}`
- WHEN `NODE_ENV` is not set in the shell environment
- AND `docker compose up` is executed
- THEN Docker Compose uses the default value `development`
- AND loads `.env.development` as the env file

### Edge Case: Deploy script with empty NODE_ENV

- GIVEN `scripts/docker-redeploy.sh` exists
- WHEN executing with `NODE_ENV=""` (empty string)
- THEN the script treats it as unset
- AND defaults to `NODE_ENV=local`
- AND validates `.env.local` exists

### Edge Case: Env file with syntax errors

- GIVEN `.env.production` exists but has syntax errors (e.g., unquoted spaces)
- WHEN `docker compose up` loads the file
- THEN Docker Compose fails with a clear error indicating the syntax issue
- AND the error message includes the line number of the problem
