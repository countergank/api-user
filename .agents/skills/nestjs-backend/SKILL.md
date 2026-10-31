---
name: nestjs-backend
description: "Trigger: NestJS, nest, backend, Nest module, Nest controller, NestJS API, API REST, TypeORM, Prisma, guard, ValidationPipe, DTO, JWT, Passport, Swagger, OpenAPI, health check, Fastify. Use this skill whenever an agent builds or modifies a NestJS backend — modules, controllers, DTOs, validation, guards, JWT auth, TypeORM or Prisma queries, migrations, error shapes, pagination, Swagger, configuration, logging, or health checks. Load it before writing backend code and open the domain files that match the task; skipping it misses the project's security, data-access and API-contract rules. Úsala siempre que se construya o modifique un backend con NestJS — módulos, controllers, DTOs, validación, guards, autenticación JWT, consultas TypeORM o Prisma, migraciones, formato de errores, paginación, Swagger, configuración, logging o health checks; léela antes de escribir código de backend y abre los archivos de dominio que apliquen."
license: MIT
permissions:
  - read-files
  - write-files
metadata:
  author: countergank
  version: "2.0.0"
---

Production NestJS backend standard. Six domain files; each rule states one decision with one ✅/❌ pair. Read the domains that match the task — the priority heading inside each file says how blocking its rules are.

| File | Read it when | Why |
|------|--------------|-----|
| `rules/controllers.md` | Adding or changing routes | Static-before-param ordering, composed decorators, response serialization |
| `rules/security.md` | Accepting request bodies or configuring bootstrap | Global ValidationPipe, Helmet/CORS allowlist, rate limits |
| `rules/data.md` | Writing entities, queries, migrations or transactions | Explicit relations, single-query fetching, migrations, atomic writes |
| `rules/auth.md` | Protecting routes or issuing tokens | Guards, guard order, Passport JWT strategy |
| `rules/api.md` | Shaping responses or documenting endpoints | OpenAPI decorators, error shape, pagination |
| `rules/operations.md` | Wiring config, logging, health or the HTTP platform | Validated config, structured logs, health checks, Fastify plugins |

## Decision reference

| Decision | Option A | Option B | Choose |
|----------|----------|----------|--------|
| ORM | TypeORM | Prisma | TypeORM for mature projects, Prisma for greenfield |
| Auth | JWT + Passport | Sessions | JWT for APIs and services, sessions for server-rendered |
| API style | REST | GraphQL | REST by default, GraphQL for complex data graphs |
| Validation | class-validator | Zod | class-validator with DTOs, Zod for runtime schemas |
| HTTP platform | Fastify | Express | Fastify for new projects (2-3x throughput), Express for existing middleware |
| Caching | CacheModule | Redis | CacheModule for a single instance, Redis when distributed |
| Tests | Jest | Vitest | Jest is the NestJS default, Vitest when the monorepo already uses it |

## Assets

- `assets/jest.config.js` — Jest coverage thresholds and the collection scope; copy it into the project so `coverageThreshold` runs in CI.
- `assets/controller-template.ts` — controller with composed decorators, response DTOs and no route-level pipe.
- `assets/module-template.ts` — feature module skeleton.
