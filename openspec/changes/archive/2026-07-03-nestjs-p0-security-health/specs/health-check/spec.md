# Spec: Health Check

**Change**: nestjs-p0-security-health
**Linear**: COU-113
**Date**: 2026-07-03

## Purpose

Provide a `/health` endpoint for Docker container orchestration and monitoring. The endpoint verifies MongoDB connectivity and returns a structured health status.

## Requirements

| ID | Requirement | Description |
|----|-------------|-------------|
| HLTH-01 | Health endpoint | `GET /health` MUST return 200 with health status (ok/error) |
| HLTH-02 | MongoDB connectivity check | Health check MUST verify MongoDB via `MongooseHealthIndicator` |
| HLTH-03 | Docker HEALTHCHECK compatibility | Docker HEALTHCHECK MUST succeed against `/health` |

### Requirement: HLTH-01 — Health Endpoint

The system MUST expose a `GET /health` endpoint that returns the application's health status. The response MUST include an overall status field (`ok` or `error`) and per-indicator details. The endpoint MUST NOT require authentication.

#### Scenario: Healthy application
- **GIVEN** the application is running and MongoDB is connected
- **WHEN** a client sends `GET /health`
- **THEN** the response status code is 200
- **AND** the response body contains `{ "status": "ok", "info": { "database": { "status": "up" } } }`

#### Scenario: MongoDB is down
- **GIVEN** the application is running but MongoDB is unreachable
- **WHEN** a client sends `GET /health`
- **THEN** the response status code is 503
- **AND** the response body contains `{ "status": "error", "error": { "database": { "status": "down" } } }`

#### Scenario: Health endpoint requires no authentication
- **GIVEN** the application is running
- **WHEN** a client sends `GET /health` without any `Authorization` header
- **THEN** the request is processed normally (no 401 Unauthorized)

#### Scenario: Health endpoint response format
- **GIVEN** the application is running
- **WHEN** a client sends `GET /health`
- **THEN** the `Content-Type` header is `application/json`
- **AND** the response body is valid JSON with `status` and `info` (or `error`) fields

### Requirement: HLTH-02 — MongoDB Connectivity Check

The health check MUST verify MongoDB connectivity using `@nestjs/terminus` with `MongooseHealthIndicator`. The `TerminusModule` MUST be imported in `AppModule`.

#### Scenario: TerminusModule registered
- **GIVEN** the application starts
- **WHEN** `AppModule` initializes
- **THEN** `TerminusModule` is imported
- **AND** `HealthCheckService` is available for injection

#### Scenario: MongooseHealthIndicator ping succeeds
- **GIVEN** MongoDB is connected and responsive
- **WHEN** `HealthCheckService.check` is called with `mongooseHealthIndicator.ping('database')`
- **THEN** the indicator returns `{ database: { status: 'up' } }`

#### Scenario: MongooseHealthIndicator ping fails
- **GIVEN** MongoDB is disconnected or unreachable
- **WHEN** `HealthCheckService.check` is called with `mongooseHealthIndicator.ping('database')`
- **THEN** the indicator throws a `HealthCheckError`
- **AND** the health endpoint returns 503 with error details

### Requirement: HLTH-03 — Docker HEALTHCHECK Compatibility

The Docker HEALTHCHECK instruction MUST succeed when `/health` returns 200. The existing Dockerfile (line 63) already targets `/health` — no Dockerfile change needed.

#### Scenario: Docker HEALTHCHECK with healthy app
- **GIVEN** the container is running and the app is healthy
- **WHEN** Docker executes the HEALTHCHECK command against `http://localhost:3000/health`
- **THEN** the HTTP response status is 200
- **AND** the HEALTHCHECK exits with code 0 (healthy)

#### Scenario: Docker HEALTHCHECK with unhealthy app
- **GIVEN** the container is running but MongoDB is down
- **WHEN** Docker executes the HEALTHCHECK command against `http://localhost:3000/health`
- **THEN** the HTTP response status is 503
- **AND** the HEALTHCHECK exits with code 1 (unhealthy)

#### Scenario: Docker HEALTHCHECK with app not ready
- **GIVEN** the container just started and the app is not yet listening
- **WHEN** Docker executes the HEALTHCHECK command
- **THEN** the connection is refused
- **AND** the HEALTHCHECK exits with code 1 (unhealthy)