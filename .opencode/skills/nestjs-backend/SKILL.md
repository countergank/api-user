---
name: nestjs-backend
description: "Trigger: NestJS, nest, backend, Nest module, Nest controller, TypeORM, Prisma, NestJS API. Develop production-ready NestJS backend applications."
license: MIT
metadata:
  author: countergank
  version: "1.0.0"
---

## When to Apply

Activate when writing NestJS code: scaffolding modules, controllers, services, or DTOs; configuring dependency injection; adding guards, pipes, interceptors, or filters; integrating TypeORM or Prisma; implementing JWT/Passport auth; exposing OpenAPI/Swagger docs; writing Jest tests; or containerizing with Docker.

## Rule Categories by Priority

| Priority | Category | Count | Key Rules |
|----------|----------|-------|-----------|
| P0 | Architecture | 3 | Modules, Providers, Dependency Injection |
| P0 | Controllers | 2 | Decorators, Route organization |
| P0 | Security | 3 | Guards, ValidationPipe, Helmet/CORS |
| P0 | Data | 4 | TypeORM entities, Repositories, N+1 query prevention, Eager/lazy loading |
| P1 | Controllers | 5 | DTO validation, Serialization, Response types, Custom param decorators, Decorator composition |
| P1 | Security | 4 | Rate limiting, CSRF, Input sanitization, File uploads |
| P1 | Data | 5 | Prisma setup, Migrations, Transactions, Select columns, Batch operations |
| P1 | Auth | 3 | JWT, Passport strategies, Guard composition |
| P1 | API | 2 | OpenAPI/Swagger, Error formats |
| P1 | Testing | 3 | Unit tests, E2E, Test.createTestingModule |
| P1 | Operations | 4 | Config module, Logging, Docker, Fastify adapter |
| P2 | Architecture | 2 | Dynamic modules, Lazy loading |
| P2 | Controllers | 4 | Versioning, Sub-domain routing, Endpoint decorator files, Controller file structure |
| P2 | Security | 2 | Encryption, Audit logging |
| P2 | Data | 2 | Read replicas, Multiple databases |
| P2 | Auth | 2 | OAuth2, API keys |
| P2 | API | 2 | Pagination, GraphQL |
| P2 | Testing | 2 | Contract tests, Coverage targets |
| P2 | Operations | 4 | Caching, Health checks, Metrics, Fastify plugins |
| P3 | Architecture | 1 | Circular dependency resolution |
| P3 | Controllers | 1 | Redirects |
| P3 | Security | 1 | IP filtering |
| P3 | Data | 1 | Seed factories |
| P3 | Auth | 1 | MFA |
| P3 | API | 1 | HATEOAS |
| P3 | Testing | 1 | Load testing |
| P3 | Operations | 1 | Distributed tracing |

## Quick Reference

Rule IDs follow the pattern `{category}-{priority}{number}` for quick lookup in the `rules/` directory.

| ID | Decision | Option A | Option B | When to choose |
|----|----------|----------|----------|----------------|
| `data-001` | ORM | TypeORM | Prisma | TypeORM for mature projects, Prisma for new/greenfield |
| `auth-001` | Auth | JWT + Passport | Sessions | JWT for APIs/microservices, sessions for server-rendered |
| `api-001` | API style | REST | GraphQL | REST by default, GraphQL for complex data graphs |
| `test-001` | Testing | Jest | Vitest | Jest (NestJS official), Vitest if already in monorepo |
| `sec-001` | Validation | class-validator | Zod | class-validator with DTOs (standard), Zod for runtime schemas |
| `ops-001` | HTTP platform | Fastify | Express | Fastify for new projects (2-3x faster), Express for compatibility with existing middleware |
| `ops-002` | Caching | CacheModule | Redis | CacheModule for simple, Redis for distributed |

## How to Use

1. **Agent loads this SKILL.md first** — the priority table tells the agent which rules matter most.
2. **Navigate `rules/<category>/` by priority** — start with `p0-*.md` files, then `p1-*.md` as context grows.
3. **Each rule file is self-contained** — read it, apply the pattern, move on. No need to load all 68 files.
4. **Compose decorators** — use `applyDecorators()` from `controllers/p1-decorator-composition.md` before writing controller logic.
5. **Reference the Quick Reference table** for technology decisions before scaffolding.
