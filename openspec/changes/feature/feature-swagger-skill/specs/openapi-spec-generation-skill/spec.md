## ADDED Requirements

### Requirement: OpenAPI Spec Generation Skill Available
The system SHALL provide an OpenCode-compatible skill that generates and maintains OpenAPI 3.1 specifications for the NestJS API.

#### Scenario: Skill loads successfully
- **WHEN** OpenCode loads the skill via `skill({ name: "openapi-spec-generation" })`
- **THEN** skill provides patterns for OpenAPI 3.1 spec generation

#### Scenario: Design-first approach
- **WHEN** user wants to design API contract before implementation
- **THEN** skill provides guidance for writing OpenAPI specs from design

#### Scenario: Code-first approach
- **WHEN** user wants to generate spec from existing NestJS decorators
- **THEN** skill analyzes @nestjs/swagger decorators and generates spec

### Requirement: NestJS Compatibility
The skill SHALL support @nestjs/swagger decorators (@ApiProperty, @ApiOperation, @ApiResponse).

#### Scenario: DTO documentation
- **WHEN** DTOs have @ApiProperty decorators
- **THEN** skill extracts schema information for OpenAPI spec

#### Scenario: Controller documentation
- **WHEN** controllers have @ApiTags and @ApiOperation decorators
- **THEN** skill extracts endpoint definitions for OpenAPI spec

### Requirement: Skill provides implementation playbook
The skill SHALL provide detailed patterns in `resources/implementation-playbook.md`.

#### Scenario: Implementation guidance
- **WHEN** agent needs to document a new endpoint
- **THEN** skill provides step-by-step implementation patterns

### Requirement: Module-level API Documentation Structure
The system SHALL organize swagger documentation at the module level, NOT in common/.

#### Scenario: Module autonomy
- **WHEN** adding API documentation to a module (e.g., UserModule, AuthModule)
- **THEN** documentation files SHALL be placed inside that module's directory
- **NOT** in a shared `common/` directory

#### Scenario: Directory structure
- **WHEN** adding swagger docs to any module
- **THEN** create the following structure inside the module:
```
src/{module}/
├── controller/
│   └── {module}.controller.ts
└── api-docs/
    ├── index.ts
    ├── decorators.ts
    └── examples/
        ├── {operation}.request.ts
        └── {operation}.response.ts
```

### Requirement: Decorator Functions with Examples
The system SHALL provide custom decorator functions that include request and response examples.

#### Scenario: Documentation with examples
- **WHEN** documenting a controller endpoint
- **THEN** use decorator functions that include @ApiOperation, @ApiResponse, and @ApiBody
- **AND** include `examples` in every response and body
- **AND** import decorators from the module's own `api-docs/` directory

#### Scenario: Example synchronization
- **WHEN** DTOs are updated
- **THEN** corresponding example files SHALL be updated in `api-docs/examples/`
- **TO** ensure documentation stays in sync with the code

### Requirement: Request and Response Examples
The system SHALL include request and response examples for every endpoint.

#### Scenario: Request example
- **WHEN** documenting an endpoint with a request body
- **THEN** include a `examples` object in @ApiBody with a sample request

#### Scenario: Response example
- **WHEN** documenting an endpoint with a response
- **THEN** include a `examples` object in @ApiResponse with a sample response

#### Scenario: Parameter examples
- **WHEN** documenting an endpoint with path/query/header parameters
- **THEN** include `example` values in @ApiParam, @ApiQuery, @ApiHeader decorators