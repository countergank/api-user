# api-user

API REST User Management — NestJS 10 + Fastify + MongoDB/Mongoose + Redis.

## Testing

| Command | What it runs | When to use |
|---------|-------------|-------------|
| `npm test` | Unit tests (`*.spec.ts`) | After code changes |
| `npm run test:e2e -- --runInBand` | E2E specs (`*.e2e-spec.ts`) | Before PR, requires Docker (Mongo + Redis) |
| `npm run test:helpers` | Test helper unit specs | After editing `test/helpers/` |
| `npm run test:cov` | Unit tests + coverage | Before merge |

**Prerequisites for e2e**: Docker Desktop with WSL integration active, then `docker compose up -d` to start MongoDB (replica set) and Redis. See [docs/e2e-testing.md](docs/e2e-testing.md) for the full runbook.
