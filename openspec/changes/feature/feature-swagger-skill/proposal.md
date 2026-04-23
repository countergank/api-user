## Why

The project needs an OpenCode-compatible skill to help AI agents generate and maintain swagger/OpenAPI documentation. While @nestjs/swagger is installed and functional, there's no dedicated skill to guide AI agents on how to properly document endpoints using the existing patterns.

## What Changes

- Install `openapi-spec-generation` skill from mdskills marketplace
- Skill provides patterns for creating, maintaining, and validating OpenAPI 3.1 specifications
- No code changes to api-user project (skill is global configuration)

## Capabilities

### New Capabilities
- `openapi-spec-generation-skill`: AI agent skill for generating and maintaining OpenAPI 3.1 specs using NestJS decorators

### Modified Capabilities
<!-- No existing spec requirements change -->

## Impact

- **Location**: `.claude/skills/openapi-spec-generation/` (global, Claude/OpenCode compatible)
- **Dependencies**: mdskills CLI tool
- **No api-user code changes**: Skill installation only affects global configuration