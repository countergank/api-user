# Exploration: Environment + Makefile Standardization

## Current State

### Environment Files Inventory

| File | Committed? | Purpose | Last Modified |
|------|-----------|---------|---------------|
| `.env.example` | Yes (git) | Schema reference / template for all envs | Jul 3 |
| `.env.production.example` | Yes (git) | Production template (incomplete) | May 14 |
| `.env.development` | No (gitignored) | Active development config | Jul 3 |
| `.env.local.testing` | No (gitignored) | Test config (used by jest.setup.ts) | Jul 3 |
| `.env.local` | **DOES NOT EXIST** | Expected by docker-redeploy.sh default | N/A |

**Git tracking**: `.gitignore` excludes `.env`, `.env.local`, `.env.*` but exempts `.env.example`. `.env.production.example` is tracked (exception not in .gitignore — works by coincidence since it doesn't match `.env.*` exactly).

### Docker Compose Analysis

**Current behavior:**
- `env_file: .env.development` is **HARDCODED** — cannot switch environments without editing compose
- `environment: DATABASE_HOST=db-user` overrides the value from env_file (correct for Docker networking)
- Image tag uses interpolation: `countergank/api-user:${NODE_ENV:-development}-${VERSION:-1.0.0}`
- Build target: `development` (not production)
- MongoDB: `--replSet rs0` with `mongo-init.js` for replica set initialization
- MongoDB auth uses `MONGO_INITDB_ROOT_USERNAME/PASSWORD` from env var interpolation with `:?` (required)

**docker-redeploy.sh behavior:**
- Defaults to `NODE_ENV=local` if no argument passed
- Passes `--env-file .env.$NODE_ENV` to `docker compose down/up`
- **BUT** docker-compose.yml ignores `--env-file` for the `env_file` directive — it always loads `.env.development`
- `--env-file` only affects variable interpolation in the compose file itself (like `${DATABASE_USER}`), NOT the `env_file` list
- **Result**: Script's env-file argument is partially effective — interpolation works, but container env vars always come from `.env.development`

### Script Inventory

| Script | Purpose | Env Handling |
|--------|---------|-------------|
| `scripts/docker-redeploy.sh` | Down + up with rebuild | Accepts NODE_ENV arg, defaults to `local` |
| `scripts/mongo-init.js` | Initialize MongoDB replica set | None (runs inside container) |
| `scripts/upgrade-package-version.js` | Bump package.json version | None |

### Package.json Scripts

| Script | Command | Notes |
|--------|---------|-------|
| `build` | `nest build` | No env needed |
| `start` | `nest start` | Reads env from process |
| `start:dev` | `nest start --watch` | Reads env from process |
| `start:debug` | `nest start --debug --watch` | Used by docker-compose |
| `start:prod` | `node dist/main` | Production entry |
| `test` | `jest --forceExit --maxWorkers=50% --detectOpenHandles` | ~86s, runs on pre-push |
| `test:unit` | jest with spec pattern | Unit only |
| `test:e2e` | jest with e2e config | Skips coverage |
| `test:cov` | jest with coverage | Coverage report |
| `test:watch` | jest --watch | Dev testing |
| `format` | biome format | Linting |
| `lint` | biome lint | Linting |
| `lint:fix` | biome lint --fix | Linting |
| `prepare` | husky | Git hooks |
| `db:drop` | docker exec mongosh | Drops dev database |
| `seed:*` | docker compose exec ts-node | Seeds via container |
| `seed:all` | npm run seed:* && ... | All seeds |

### Husky Pre-push Hook

Runs `npm test` before every push. This is the full test suite (~86s). The e2e test is commented out.

### Dockerfile Structure

| Stage | Base | Purpose |
|-------|------|---------|
| `base` | node:18-alpine | Shared: apk install python3, make, g++ |
| `development` | base | npm ci + copy all + CMD start:dev |
| `build` | base | Copies node_modules from development, runs nest build |
| `production` | node:18-alpine | Fresh npm ci --omit=dev + copy dist + CMD node dist/main |

**No env vars needed at build time.** All env vars are runtime-only.

## Required vs Optional Env Vars

### Required (10 vars — @IsNotEmpty)

| Env Var | Validator | Default Applied? |
|---------|-----------|-----------------|
| `NODE_ENV` | @IsEnum(local,development,test,qa,production) + @IsNotEmpty | No |
| `VERSION` | @IsString + @IsNotEmpty | No |
| `DATABASE_USER` | @IsString + @IsNotEmpty | No |
| `DATABASE_PASSWORD` | @IsString + @IsNotEmpty | No |
| `DATABASE_HOST` | @IsString + @IsNotEmpty | No |
| `DATABASE_PORT` | @IsString + @IsNotEmpty | No |
| `DATABASE_NAME` | @IsString + @IsNotEmpty | No |
| `ENCRYPTION_PASSWORD` | @IsString + @IsNotEmpty | No |
| `JWT_SECRET` | @IsString + @IsNotEmpty | No |
| `CORS_ORIGINS` | @IsString + @IsNotEmpty | No |

### Optional (33 vars — @IsOptional or @IsIn/@IsEnum with @IsOptional)

| Env Var | Validator | Default in validate() |
|---------|-----------|----------------------|
| `HOST` | @IsString + @IsOptional | - |
| `PORT` | @IsString + @IsOptional | - |
| `DEBUG` | @IsString + @IsOptional | - |
| `EXAMPLE_MICROSERVICE_HOST` | @IsString + @IsOptional | - |
| `EXAMPLE_MICROSERVICE_PORT` | @IsString + @IsOptional | - |
| `EMAIL_ENABLED` | @IsString + @IsOptional | - |
| `EMAIL_PROVIDER` | @IsString + @IsOptional | - |
| `EMAIL_HOST` | @IsString + @IsOptional | - |
| `EMAIL_PORT` | @IsString + @IsOptional | - |
| `EMAIL_SECURE` | @IsString + @IsOptional | - |
| `EMAIL_USER` | @IsString + @IsOptional | - |
| `EMAIL_PASS` | @IsString + @IsOptional | - |
| `EMAIL_FROM` | @IsString + @IsOptional | - |
| `RESEND_API_KEY` | @IsString + @IsOptional | - |
| `RESEND_FROM_EMAIL` | @IsString + @IsOptional | - |
| `RESEND_FROM_NAME` | @IsString + @IsOptional | - |
| `FRONTEND_URL` | @IsString + @IsOptional | - |
| `ACTIVATION_TOKEN_EXPIRATION_HOURS` | @IsString + @IsOptional | - |
| `PASSWORD_RESET_TOKEN_EXPIRATION_HOURS` | @IsString + @IsOptional | - |
| `THROTTLE_TTL` | @IsString + @IsOptional | - |
| `THROTTLE_LIMIT` | @IsString + @IsOptional | - |
| `LOGIN_THROTTLE_TTL` | @IsString + @IsOptional | - |
| `LOGIN_THROTTLE_LIMIT` | @IsString + @IsOptional | - |
| `REGISTER_THROTTLE_TTL` | @IsString + @IsOptional | - |
| `REGISTER_THROTTLE_LIMIT` | @IsString + @IsOptional | - |
| `FORGOT_PASSWORD_THROTTLE_TTL` | @IsString + @IsOptional | - |
| `FORGOT_PASSWORD_THROTTLE_LIMIT` | @IsString + @IsOptional | - |
| `MAX_LOGIN_ATTEMPTS` | @IsString + @IsOptional | - |
| `LOCKOUT_DURATION_MINUTES` | @IsString + @IsOptional | - |
| `AUDIT_ENABLED` | @IsEnum('true','false') + @IsOptional | 'true' |
| `AUDIT_RETENTION_DAYS` | @Matches(positive int) + @IsOptional | '30' |
| `AUDIT_LEVEL` | @IsEnum('minimal','standard','verbose') + @IsOptional | 'standard' |
| `LOG_LEVEL` | @IsIn('trace','debug','info','warn','error','fatal','silent') + @IsOptional | - |

## Env Var Drift Table

| Env Var | Required? | .env.development | .env.local.testing | .env.production.example | .env.example |
|---------|-----------|------------------|--------------------|-----------------------|-------------|
| NODE_ENV | **Required** | development | development | production | development |
| VERSION | **Required** | 1.0.0 | 1.0.0 | (empty) | 1.0.0 |
| DATABASE_USER | **Required** | dev_user | test_user | (empty) | your_db_user |
| DATABASE_PASSWORD | **Required** | dev_password | test_password | (empty) | your_db_password |
| DATABASE_HOST | **Required** | db-user | localhost | (empty) | localhost |
| DATABASE_PORT | **Required** | 27017 | 27017 | 27017 | 27017 |
| DATABASE_NAME | **Required** | api_user | api_user_test | api_user | api_user |
| ENCRYPTION_PASSWORD | **Required** | dev_encryption... | test_encryption... | (empty) | your_encryption... |
| JWT_SECRET | **Required** | dev-jwt-secret... | test-jwt-secret... | **MISSING** | (empty) |
| CORS_ORIGINS | **Required** | localhost:3000,... | **MISSING** | **MISSING** | localhost:3000 |
| HOST | Optional | 0.0.0.0 | 0.0.0.0 | 0.0.0.0 | 0.0.0.0 |
| PORT | Optional | 3000 | 3000 | 3000 | 3000 |
| DEBUG | Optional | true | false | (commented) | (commented) |
| EXAMPLE_MICROSERVICE_HOST | Optional | localhost | **MISSING** | (commented) | (commented) |
| EXAMPLE_MICROSERVICE_PORT | Optional | 3001 | **MISSING** | (commented) | (commented) |
| EMAIL_ENABLED | Optional | true | **MISSING** | **MISSING** | (commented) |
| EMAIL_PROVIDER | Optional | smtp | **MISSING** | **MISSING** | (commented) |
| EMAIL_HOST | Optional | smtp.gmail.com | **MISSING** | **MISSING** | (commented) |
| EMAIL_PORT | Optional | 587 | **MISSING** | **MISSING** | (commented) |
| EMAIL_SECURE | Optional | false | **MISSING** | **MISSING** | (commented) |
| EMAIL_USER | Optional | countergank.ti@... | **MISSING** | **MISSING** | (commented) |
| EMAIL_PASS | Optional | jiha thrc... | **MISSING** | **MISSING** | (commented) |
| EMAIL_FROM | Optional | countergank.ti@... | **MISSING** | **MISSING** | (commented) |
| RESEND_API_KEY | Optional | (commented) | **MISSING** | **MISSING** | (commented) |
| RESEND_FROM_EMAIL | Optional | (commented) | **MISSING** | **MISSING** | (commented) |
| RESEND_FROM_NAME | Optional | (commented) | **MISSING** | **MISSING** | (commented) |
| FRONTEND_URL | Optional | localhost:5173 | **MISSING** | **MISSING** | (commented) |
| ACTIVATION_TOKEN_EXPIRATION_HOURS | Optional | 24 | **MISSING** | **MISSING** | (commented) |
| PASSWORD_RESET_TOKEN_EXPIRATION_HOURS | Optional | 1 | **MISSING** | **MISSING** | (commented) |
| THROTTLE_TTL | Optional | 60 | **MISSING** | (commented) | (commented) |
| THROTTLE_LIMIT | Optional | 10 | **MISSING** | (commented) | (commented) |
| LOGIN_THROTTLE_TTL | Optional | 60 | **MISSING** | (commented) | (commented) |
| LOGIN_THROTTLE_LIMIT | Optional | 5 | **MISSING** | (commented) | (commented) |
| REGISTER_THROTTLE_TTL | Optional | 60 | **MISSING** | (commented) | (commented) |
| REGISTER_THROTTLE_LIMIT | Optional | 10 | **MISSING** | (commented) | (commented) |
| FORGOT_PASSWORD_THROTTLE_TTL | Optional | 60 | **MISSING** | (commented) | (commented) |
| FORGOT_PASSWORD_THROTTLE_LIMIT | Optional | 3 | **MISSING** | (commented) | (commented) |
| MAX_LOGIN_ATTEMPTS | Optional | 5 | **MISSING** | (commented) | (commented) |
| LOCKOUT_DURATION_MINUTES | Optional | 15 | **MISSING** | (commented) | (commented) |
| AUDIT_ENABLED | Optional | **MISSING** | **MISSING** | **MISSING** | **MISSING** |
| AUDIT_RETENTION_DAYS | Optional | **MISSING** | **MISSING** | **MISSING** | **MISSING** |
| AUDIT_LEVEL | Optional | **MISSING** | **MISSING** | **MISSING** | **MISSING** |
| LOG_LEVEL | Optional | **MISSING** | **MISSING** | **MISSING** | **MISSING** |

### Missing Required Vars Summary

| File | Missing Required Vars |
|------|----------------------|
| `.env.development` | None (complete) |
| `.env.local.testing` | `CORS_ORIGINS` |
| `.env.production.example` | `JWT_SECRET`, `CORS_ORIGINS` |
| `.env.example` | None (template with placeholders) |

### Missing Optional Vars (all files)

**AUDIT_ENABLED, AUDIT_RETENTION_DAYS, AUDIT_LEVEL, LOG_LEVEL** — missing from ALL env files but have defaults in `validate()`. Should be documented in `.env.example`.

## Docker-Compose Problems

1. **Hardcoded env_file**: `env_file: .env.development` cannot be changed without editing the file
2. **--env-file mismatch**: `docker-redeploy.sh` passes `--env-file .env.$NODE_ENV` but compose ignores it for the `env_file` directive
3. **No .env.local**: Script defaults to `local` but file doesn't exist
4. **Build target**: Always builds `development` stage, not appropriate for production deploys
5. **MongoDB replica set**: `--replSet rs0` requires `mongo-init.js` (exists and works)

## Recommended Approach

### 1. Create `.env.local` (local development baseline)
- Copy from `.env.development` with `NODE_ENV=local`
- Add to `.gitignore` (already covered by `.env.local` pattern)

### 2. Fix docker-compose.yml for dynamic environments
- Remove hardcoded `env_file: .env.development`
- Use `env_file: .env.${NODE_ENV:-development}` (compose variable substitution)
- Or use a single `.env` file approach with `--env-file` flag only
- **Recommended**: Use `env_file: - .env` as default, let `--env-file` flag override via symlink or explicit file

### 3. Create Makefile with standard targets

```
Targets:
  install      - npm ci
  build        - nest build
  start        - nest start
  dev          - nest start --watch
  debug        - nest start --debug --watch
  prod         - node dist/main
  test         - jest (full suite)
  test:unit    - unit tests only
  test:e2e     - e2e tests
  test:cov     - tests with coverage
  lint         - biome lint
  lint:fix     - biome lint --fix
  format       - biome format --fix
  docker:up    - docker compose up -d --build
  docker:down  - docker compose down
  docker:logs  - docker compose logs -f api-user
  docker:stop  - docker compose stop
  deploy       - ./scripts/docker-redeploy.sh $(env)
  db:drop      - drop development database
  seed:all     - run all seeds
  seed:perms   - seed permissions
  seed:roles   - seed roles
  seed:users   - seed users
  seed:email   - seed email templates
  clean        - rm -rf dist node_modules coverage
  help         - list all targets
```

### 4. Fix env var drift
- Add `CORS_ORIGINS` to `.env.local.testing`
- Add `JWT_SECRET` and `CORS_ORIGINS` to `.env.production.example`
- Add audit/logging vars to `.env.example` with comments
- Sync all optional vars across files (or document which are needed per env)

### 5. Update docker-redeploy.sh
- Validate that `.env.$NODE_ENV` exists before proceeding
- Create `.env.local` if missing and NODE_ENV=local
- Fix the `--env-file` / `env_file` disconnect

## Files to Modify/Create

### Create
1. `.env.local` — local development environment (gitignored)
2. `Makefile` — build/run/test/deploy targets
3. `.env.staging` (optional) — if staging environment needed

### Modify
1. `docker-compose.yml` — dynamic env_file, configurable build target
2. `scripts/docker-redeploy.sh` — validation, error handling
3. `.env.local.testing` — add missing CORS_ORIGINS
4. `.env.production.example` — add missing JWT_SECRET, CORS_ORIGINS
5. `.env.example` — add audit/logging vars, improve documentation
6. `.env.development` — add audit/logging vars (optional, has defaults)
7. `.gitignore` — verify `.env.staging` pattern if created

## Risks

1. **Breaking existing dev workflow**: Developers who run `./scripts/docker-redeploy.sh` without args expect `local` — creating `.env.local` fixes this but changes the "works out of the box" assumption
2. **docker-compose env_file behavior**: Compose variable substitution in `env_file` list (`${NODE_ENV}`) works in docker-compose v2 but behavior varies — needs testing
3. **MongoDB replica set**: `mongo-init.js` uses `localhost:27017` which works inside the container but may not work if accessed from another container by service name
4. **Email credentials in .env.development**: Real Gmail credentials are committed to a gitignored file — should be documented as needing personal app passwords
5. **Makefile availability**: Not all developers have `make` installed (especially Windows without WSL) — npm scripts should remain as fallback

## Ready for Proposal

**Yes.** The investigation is complete. The orchestrator should:
1. Present findings to the user
2. Confirm the scope: Makefile creation, env file fixes, docker-compose dynamic env
3. Get approval to proceed with implementation
4. Key decision needed: single `.env` file vs per-environment `.env.*` files approach

skill_resolution: none
