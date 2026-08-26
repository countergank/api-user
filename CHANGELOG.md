# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-08-26

### Added

- **User Management API** — CRUD de usuarios con paginación, búsqueda y filtros
- **Authentication** — JWT login, register, forgot/reset password, email verification
- **RBAC** — Roles y permisos con guards, cache-aside en RoleService y PermissionService
- **Parameter Store** — Runtime configuration management con Redis backend, @Parameter() decorator, migración de 23 process.env
- **Cache Layer** — CacheService con Redis, user cache para JWT validation (COU-145/146)
- **Redis** — Integración completa: health checks, cache, parameter store (COU-156)
- **Error Handling** — Sistema unificado de errores con DomainError, AllExceptionsFilter global (COU-203)
- **Structured Logging** — nestjs-pino con contexto de request (COU-116)
- **MongoDB** — Transactions y data integrity (COU-115)
- **Rate Limiting** — Configurable por endpoint (login: 5/60s, register: 10/60s, forgot-password: 3/60s)
- **Account Lockout** — Bloqueo tras 5 intentos fallidos, duración configurable, admin unlock
- **Audit Logging** — Interceptor con event emitter para trazabilidad
- **i18n** — Soporte multi-idioma (EN/ES/PT)
- **Scalar API Reference** — Documentación visual interactiva reemplazando Swagger UI
- **Health Check** — Endpoint `/health` con status de DB y Redis
- **E2E Tests** — 149 tests cubriendo todos los endpoints
- **CI** — GitHub Actions con unit + e2e tests en cada PR

### Fixed

- Seguridad P0: endpoints sin autenticación y health check (COU-113)
- change-password valida password actual y hashea el nuevo
- Docker: HUSKY=0 en producción para skip de prepare script
- CI: mongosh in-container para replica set init

### Changed

- Performance: MongoDB indexes para queries de paginación y audit logs (COU-149)
- Dockerfile migrado a Node 22 para compatibilidad ESM (Scalar)

## [Unreleased]

