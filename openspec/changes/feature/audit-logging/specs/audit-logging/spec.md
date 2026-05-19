# audit-logging Specification

## Purpose

Structured audit trail with HTTP-level automatic request audit plus business-level event-driven logging, persisted to `audit_logs` MongoDB collection. Every critical action gets an immutable trail: who, what, when, from where, and with what result. Hybrid approach: global NestJS interceptor (HTTP) + `@AuditAction()` decorator with EventEmitter2 (business).

## Requirements

| ID | Requirement | Description |
|----|-------------|-------------|
| AL-01 | HTTP request audit | HTTP mutations (POST/PUT/PATCH/DELETE) MUST generate an audit log entry with: timestamp, user ID (or anonymous), IP address, HTTP method, endpoint path, response status code, request duration, user-agent, correlation ID. GET requests MUST NOT be audited by default (see AL-09 for AUDIT_LEVEL) |
| AL-02 | Business action audit | Service methods decorated with `@AuditAction()` MUST emit audit events containing: action name, resource type, resource ID, actor (user), timestamp, and business context (before/after values for mutations) |
| AL-03 | Sensitive data redaction | Audit log entries MUST NOT contain: passwords, tokens, authorization headers, refresh tokens, verification tokens. These fields MUST be replaced with `[REDACTED]` before persistence |
| AL-04 | Admin audit querying | Admin users MUST be able to query audit logs with filters: user ID, action type, resource type, date range (from/to), IP address. Results MUST be paginated. Non-admin users MUST be denied access |
| AL-05 | Audit retention | Audit log entries MUST be automatically removed after configurable retention period (default 30 days) via MongoDB TTL index on `createdAt` |
| AL-06 | Audit enable/disable | Setting `AUDIT_ENABLED=false` MUST stop all audit log creation. When disabled, no audit entry is created for any request or action |
| AL-07 | Environment configuration | `AUDIT_ENABLED` (boolean, default true), `AUDIT_RETENTION_DAYS` (integer, default 30), and `AUDIT_LEVEL` (enum: `minimal` / `standard` / `verbose`, default `standard`) MUST be validated in env validation |
| AL-08 | Async audit persistence | Business-level audit writes MUST be asynchronous via EventEmitter2 — MUST NOT block the HTTP response |
| AL-09 | Audit level configuration | `AUDIT_LEVEL` env var MUST control interceptor verbosity: `minimal` (auth events only), `standard` (mutations POST/PUT/PATCH/DELETE — default), `verbose` (every request including GETs). Business-level `@AuditAction()` events MUST be unaffected by `AUDIT_LEVEL` |

## Scenarios

### AL-S01: HTTP mutation generates audit entry

**Given** `AUDIT_ENABLED=true` and `AUDIT_LEVEL=standard`
**And** an authenticated user sends POST /users with valid body
**When** the request completes with HTTP 201
**Then** an audit log entry is created with: user ID, IP, method `POST`, path `/users`, status `201`, duration in ms, user-agent, correlation ID

### AL-S02: Unauthenticated request logs anonymous user

**Given** `AUDIT_ENABLED=true`
**And** an unauthenticated client sends POST /auth/login with invalid credentials
**When** the request completes with HTTP 401
**Then** an audit log entry is created with: user ID as `anonymous`, IP, method `POST`, path `/auth/login`, status `401`, duration, user-agent, correlation ID

### AL-S03: Decorated service method emits business audit event

**Given** `AUDIT_ENABLED=true`
**And** an admin calls a service method decorated with `@AuditAction({ action: 'user.create', resource: 'user' })`
**When** the method executes successfully
**Then** an audit event is emitted with: action `user.create`, resource type `user`, resource ID (new user `_id`), actor (admin user ID), timestamp, and before/after values

### AL-S04: Sensitive fields are redacted before persistence

**Given** a login request with body `{ "email": "user@test.com", "password": "secret123" }`
**And** the HTTP audit interceptor captures the request payload
**When** the audit entry is persisted
**Then** the `password` field in the audit log MUST be `[REDACTED]`
**And** the `authorization` header MUST be `[REDACTED]`

### AL-S05: Admin queries audit logs with filters

**Given** an admin user with role `admin`
**And** audit logs exist for multiple users and actions
**When** the admin sends GET /audit-logs?userId=xxx&action=user.create&from=2026-01-01&to=2026-05-01&page=1&limit=20
**Then** the response returns paginated audit entries matching all filters
**And** the response includes total count and pagination metadata

### AL-S06: Non-admin cannot access audit logs

**Given** a user with role `user` (not admin)
**When** the user sends GET /audit-logs
**Then** the server MUST respond with HTTP 403 Forbidden

### AL-S07: TTL index removes old entries

**Given** `AUDIT_RETENTION_DAYS=30`
**And** an audit log entry with `createdAt` older than 30 days
**When** MongoDB's TTL index processes the collection
**Then** the entry MUST be automatically deleted

### AL-S08: Audit disabled prevents all entries

**Given** `AUDIT_ENABLED=false`
**And** a user sends POST /auth/login
**And** an admin calls a `@AuditAction()` decorated method
**When** both actions complete
**Then** NO audit log entries are created in the `audit_logs` collection

### AL-S09: Env validation for audit config

**Given** `AUDIT_ENABLED` is set to `invalid` (non-boolean string)
**When** the application starts
**Then** the application MUST fail to start with a validation error

**Given** `AUDIT_RETENTION_DAYS` is set to `-5`
**When** the application starts
**Then** the application MUST fail to start with a validation error

**Given** `AUDIT_LEVEL` is set to `invalid` (not `minimal`, `standard`, or `verbose`)
**When** the application starts
**Then** the application MUST fail to start with a validation error

### AL-S10: GET requests excluded in standard mode

**Given** `AUDIT_ENABLED=true` and `AUDIT_LEVEL=standard` (default)
**And** an authenticated user sends GET /users
**When** the request completes with HTTP 200
**Then** NO audit log entry is created for this GET request

### AL-S11: Minimal mode only audits auth endpoints

**Given** `AUDIT_ENABLED=true` and `AUDIT_LEVEL=minimal`
**And** a user sends POST /auth/login
**When** the request completes
**Then** an audit log entry IS created (auth endpoint, always audited in minimal mode)

**Given** `AUDIT_ENABLED=true` and `AUDIT_LEVEL=minimal`
**And** an admin sends POST /users
**When** the request completes
**Then** NO audit log entry is created (non-auth endpoint, skipped in minimal mode)

### AL-S12: Verbose mode audits GET requests

**Given** `AUDIT_ENABLED=true` and `AUDIT_LEVEL=verbose`
**And** an authenticated user sends GET /users
**When** the request completes with HTTP 200
**Then** an audit log entry IS created — verbose mode captures all requests including GETs

## Affected Files

| File | Change |
|------|--------|
| `src/common/audit/` | New module: service, entity, repository, interceptor, decorator, listener, DTOs, interfaces |
| `src/main.ts` | Add `nestjs-cls` middleware, register global audit interceptor |
| `src/config/env.validation.ts` | Add `AUDIT_ENABLED`, `AUDIT_RETENTION_DAYS`, `AUDIT_LEVEL` validation |
| `src/app/app.module.ts` | Import `AuditModule`, `ClsModule` |
| `src/auth/auth.service.ts` | Add `@AuditAction()` decorators to login, register, password-reset methods |
| `src/user/service/user.service.ts` | Add `@AuditAction()` decorators to CRUD, toggle-active, unlock methods |
| `src/rbac/services/*.service.ts` | Add `@AuditAction()` decorators to role/permission CRUD methods |

## Endpoints

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| GET | /audit-logs | Admin only | Query audit logs with filters and pagination |

## Error Codes

| HTTP Status | Error Code | Description |
|-------------|-----------|-------------|
| 403 | FORBIDDEN | Non-admin user attempted to access audit logs |
