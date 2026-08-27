# E2E Testing Runbook

Quick guide to running the full e2e test suite locally and in CI.

## Quick path

1. Start infrastructure: `docker compose up -d`
2. Wait for Mongo replica set to initialize (~10s): `docker logs mongo-init -f` until you see `mongo-init: done`
3. Copy env: `cp .env.local.testing .env.local.testing` (already exists, gitignored)
4. Run: `npm run test:e2e -- --runInBand`
5. All tests should pass with exit code 0.

## Prerequisites

### Docker Desktop

- **WSL integration must be active** — Docker Desktop → Settings → Resources → WSL Integration → enable for your distro.
- `docker compose up -d` starts three services:

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `db-user` | `mongo:6.0.3` | 27017 | MongoDB replica set (`rs0`) |
| `mongo-init` | `mongo:6.0.3` | — | Initializes replica set + creates `dev_user` |
| `redis` | `redis:7-alpine` | 6379 | Redis cache |

- The `mongo-init` service runs after `db-user` starts, initiates the replica set, waits for PRIMARY state, then creates the `dev_user` account with root role.

### Environment variables

The e2e suite reads `.env.local.testing` (gitignored). Required vars:

| Var | Value (default) | Purpose |
|-----|----------------|---------|
| `DATABASE_USER` | `dev_user` | MongoDB auth user |
| `DATABASE_PASSWORD` | `dev_password` | MongoDB auth password |
| `DATABASE_HOST` | `localhost` | Host from WSL (not container name) |
| `DATABASE_PORT` | `27017` | MongoDB port |
| `DATABASE_NAME` | `api_user_test` | Separate test database |
| `JWT_SECRET` | `test-jwt-secret-key-for-testing` | JWT signing |
| `ENCRYPTION_PASSWORD` | `test_encryption_password_min_32_chars` | Field encryption (min 32 chars) |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:5173` | CORS allowlist |
| `EMAIL_ENABLED` | `false` | Email stubs (no real SMTP) |
| `REDIS_HOST` | `localhost` | Redis host from WSL |
| `REDIS_PORT` | `6379` | Redis port |
| `LOG_LEVEL` | `info` | Log verbosity (use `silent` for CI) |

## Commands

```bash
# Start all infrastructure services
docker compose up -d

# Verify Mongo is ready (should print "mongo-init: done")
docker logs mongo-init 2>&1 | tail -1

# Run full e2e suite (single-threaded for DB isolation)
npm run test:e2e -- --runInBand

# Run a single e2e spec file
npm run test:e2e -- --testPathPattern='rbac\.e2e-spec'

# Run e2e with verbose output
npm run test:e2e -- --runInBand --verbose

# Run helper unit tests
npm run test:helpers

# Run unit tests
npm test
```

## CI notes

The `.github/workflows/test.yml` workflow runs on every push and PR to `develop`, `staging`, and `main`:

- **MongoDB**: started via `docker run` (not docker compose), then initialized with `docker exec mongodb mongosh ...`
- **Redis**: started as a GitHub Actions service container
- **Env vars**: all required vars are set as `env:` in the workflow step — no `.env` file needed
- **E2E command**: `npm run test:e2e` (no `--runInBand` needed — CI runs single job)
- **Unit tests**: `npm test` runs first, then e2e

If CI fails on e2e:
1. Check the MongoDB replica set init logs in the workflow output
2. Verify `DATABASE_NAME` matches the CI value (`api_user`, not `api_user_test`)
3. Check for flaky tests — the suite has no intentional flaky scenarios

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Server selection timed out after 10000ms` | Mongo not ready — wait for `mongo-init: done` or run `docker compose restart mongo-init` |
| `Redis ETIMEDOUT` | Docker not running or WSL integration disabled |
| `ECONNREFUSED 127.0.0.1:27017` | Mongo container not started — `docker compose up -d db-user` |
| Tests fail with `401` on protected endpoints | `JWT_SECRET` mismatch between `.env.local.testing` and test setup |
| `Cannot use import statement outside a module` | Run with `npx jest --config ./test/jest-e2e.json` |
