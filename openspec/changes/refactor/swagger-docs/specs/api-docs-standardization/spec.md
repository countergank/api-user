# API Documentation Standardization Specification

## ADDED Requirements

### Requirement: Per-Module Documentation Structure

Each module MUST have its own `api-docs/` directory inside the module folder. Documentation MUST NOT be placed in `common/` directory.

#### Scenario: Module has own api-docs directory

- GIVEN a NestJS module (e.g., `rbac`, `auth`)
- WHEN the module is being documented
- THEN a `src/{module}/api-docs/` directory MUST exist with:
  - `index.ts` - exports all decorator functions
  - `{module}.decorator.ts` - custom decorator functions
  - `examples/` - request and response examples

### Requirement: Custom Decorator Functions

Modules MUST use custom decorator functions instead of inline `@nestjs/swagger` decorators. Decorators MUST be named descriptively and MUST include `@ApiOperation`, `@ApiResponse`, and `@ApiBody` where applicable.

#### Scenario: Custom decorator applied to endpoint

- GIVEN a controller endpoint (e.g., `POST /auth/login`)
- WHEN decorator function is applied
- THEN the endpoint MUST use a custom decorator function (e.g., `ApplyLoginDoc()`)
- AND the decorator MUST include all necessary `@nestjs/swagger` decorators combined via `applyDecorators()`

#### Scenario: Inline decorators replaced

- GIVEN a controller using inline decorators
- WHEN migration to custom decorators is performed
- THEN all inline `@ApiOperation`, `@ApiResponse`, `@ApiBody` decorators MUST be removed
- AND replaced with a single custom decorator function

### Requirement: Request/Response Examples

Every endpoint MUST have request example and response example defined. Examples MUST match actual DTO schemas and MUST be valid JSON.

#### Scenario: Endpoint with examples

- GIVEN an endpoint (e.g., `POST /auth/register`)
- WHEN documentation is generated
- THEN a request example MUST be defined in the decorator
- AND a response example MUST be defined in the decorator
- AND examples MUST be valid JSON objects

#### Scenario: Endpoint without examples

- GIVEN an endpoint without examples (e.g., `GET /permissions`)
- WHEN migration is performed
- THEN examples MUST be added matching the response DTO schema

### Requirement: auth module documentation

The auth module MUST have its own `api-docs/` directory with decorator functions for all endpoints.

#### Scenario: Auth module decorated

- GIVEN the auth module
- WHEN documentation structure is implemented
- THEN `src/auth/api-docs/` MUST exist with:
  - `auth.decorator.ts` - `ApplyRegisterDoc()`, `ApplyLoginDoc()`, `ApplyForgotPasswordDoc()`, `ApplyResetPasswordDoc()`, `ApplyRefreshDoc()`
  - Request examples for register, login, forgot-password, reset-password, refresh
  - Response examples for success and error scenarios

#### Scenario: Register endpoint with examples

- GIVEN POST /auth/register endpoint
- WHEN decorator is applied
- THEN request example MUST include: `email`, `userName`, `password`, `name`, `lastName`
- AND response example MUST include: `id`, `email`, `userName`, `name`, `lastName`, `accessToken`, `refreshToken`

#### Scenario: Login endpoint with examples

- GIVEN POST /auth/login endpoint
- WHEN decorator is applied
- THEN request example MUST include: `email`, `password`
- AND response example MUST include: `accessToken`, `refreshToken`

### Requirement: rbac module documentation

The rbac module MUST have its own `api-docs/` directory with decorator functions for role and permission endpoints.

#### Scenario: RBAC module decorated

- GIVEN the rbac module
- WHEN documentation structure is implemented
- THEN `src/rbac/api-docs/` MUST exist with:
  - `rbac.decorator.ts` - role and permission decorator functions
  - Examples for role CRUD and permission list operations

#### Scenario: Role endpoints with examples

- GIVEN GET /roles endpoint
- WHEN decorator is applied
- THEN response example MUST include array of roles with `id`, `name`, `description`, `permissions`

#### Scenario: Permission endpoints with examples

- GIVEN GET /permissions endpoint
- WHEN decorator is applied
- THEN response example MUST include array of permissions with `id`, `resource`, `action`, `description`

### Requirement: user-profile controller integration

The user-profile.controller.ts MUST use existing `user/api-docs/` decorators instead of inline decorators.

#### Scenario: User-profile migrated

- GIVEN user-profile.controller.ts
- WHEN migration is performed
- THEN inline decorators MUST be replaced with existing `user/api-docs/` decorators
- AND all profile endpoints MUST have examples

### Requirement: app module completeness

The app module endpoints MUST all have request/response examples defined.

#### Scenario: App module verified

- GIVEN app module
- WHEN verification is performed
- THEN all endpoints in app.controller.ts MUST have:
  - Response examples visible in Swagger UI
  - Request examples where body is required

#### Scenario: Health check endpoint example

- GIVEN GET / (health check/version)
- WHEN examples are verified
- THEN response example MUST include: `version`, `name`, `repository`

### Requirement: Deprecation of common/api-docs/

The `common/api-docs/` directory MUST be deprecated and any reusable patterns moved to respective modules.

#### Scenario: Common api-docs deprecated

- GIVEN common/api-docs/ exists
- WHEN deprecation is performed
- THEN common/api-docs/ MUST be marked as deprecated
- AND any reusable decorators MUST be moved to appropriate modules

#### Scenario: Migration path documented

- GIVEN common/api-docs/ deprecation
- WHEN migration is complete
- THEN documentation MUST exist showing:
  - Which patterns moved to which modules
  - Migration steps for affected controllers

## Verification Scenarios

### Scenario: Swagger UI loads without errors

- GIVEN application is running
- WHEN accessing `/api/docs`
- THEN Swagger UI MUST load successfully
- AND no errors in console

### Scenario: All endpoints in OpenAPI spec

- GIVEN OpenAPI document is generated
- WHEN inspecting the spec
- THEN all 7 controllers MUST appear in the spec
- AND all endpoints MUST have operationId defined

### Scenario: Each endpoint has examples

- GIVEN Swagger UI is loaded
- WHEN viewing endpoint details
- THEN each endpoint MUST show request example
- AND each endpoint MUST show response example

### Scenario: No inline decorators in migrated controllers

- GIVEN migrated controllers (auth, rbac, user-profile)
- WHEN inspecting source
- THEN inline @ApiXxx decorators MUST NOT exist
- AND custom decorator functions MUST be used

### Scenario: common/api-docs deprecated

- GIVEN common/api-docs/ directory
- WHEN verification is performed
- THEN directory MUST be marked as deprecated OR removed