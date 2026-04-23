## Context

The project already has @nestjs/swagger@7.4.0 installed with Swagger UI at /docs. Existing patterns include:
- `applyDocsDecorators()` helper in `src/common/api-docs/defaults.decorator.ts`
- Inline decorators (@ApiOperation, @ApiResponse) in some controllers
- Gaps in permission.controller, role.controller, user-profile.controller

**NEW REQUIREMENTS** (from session 2026-04-22):
- API documentation MUST be at module level (NOT in common/)
- Every endpoint MUST include request/response examples
- Examples MUST stay synchronized with DTOs

## Goals / Non-Goals

**Goals:**
- Install openapi-spec-generation skill for AI agents
- Provide clear patterns for OpenAPI 3.1 spec generation
- Enable design-first and code-first approaches
- **NEW**: Document module-level API docs pattern with examples

**Non-Goals:**
- Rewrite existing swagger decorators (legacy can stay)
- Generate new endpoints
- Modify existing DTOs or controllers

## Decisions

### Decision 1: Skill Selection
**Chosen**: `openapi-spec-generation` by sickn33/mdskills

| Criteria | Why |
|----------|-----|
| OpenCode Compatible | Listed officially in mdskills marketplace |
| NestJS Support | Works with decorators (@nestjs/swagger) |
| Flexible Approach | Supports design-first AND code-first |
| Low Risk | No code changes, just documentation guidance |

**Alternatives considered**:
- `api-doc-generator` (terminal-skills): Has drift detection but not officially OpenCode compatible
- `generate-swagger-docs` (qodex-ai): Good framework detection but less flexible

### Decision 2: Installation Location
**Chosen**: `.claude/skills/openapi-spec-generation/`

OpenCode searches both:
- `~/.config/opencode/skills/*/SKILL.md`
- `.claude/skills/*/SKILL.md` (Claude Code compatible)

mdskills installs to `.claude/skills/` by default, which works for both tools.

### Decision 3: Module-level API Documentation Structure
**Chosen**: Each module has its own `api-docs/` directory

| Alternative | Why Rejected |
|-------------|--------------|
| `common/api-docs/` | Centralized but distant from modules, harder to maintain |
| **Per-module `api-docs/`** | Cohesion: docs live with the module they document |

**Structure**:
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

### Decision 4: Decorator Functions with Examples
**Chosen**: Custom decorator functions that include examples

**Pattern**:
```typescript
// Use
@Post()
@applyUserDocs('create')  // Single decorator with examples

// Instead of
@ApiOperation({ summary: '...' })
@ApiResponse({ status: 201, type: ... })
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| Skill not detected by OpenCode | Symlink to ~/.config/opencode/skills/ if needed |
| Patterns don't match existing code | Skill is flexible; adapts to project patterns |
| Examples fall out of sync with DTOs | Include in code review checklist |

## Migration Plan

### Phase 1: Skill Installation (COMPLETED)
1. **Install**: `npx mdskills install sickn33/openapi-spec-generation`
2. **Verify**: Check skill loads in OpenCode
3. **Document**: Save pattern in skill-registry and refs

### Phase 2: Pattern Documentation (COMPLETED)
1. Document module-level structure in:
   - `.opencode/refs/api-docs-pattern.md`
   - `.atl/skill-registry.md`
   - Engram memory

### Phase 3: Future Implementation (NOT YET STARTED)
When adding new API documentation:
1. Create `api-docs/` directory inside the module
2. Create `examples/` subdirectory
3. Create decorator functions with embedded examples
4. Ensure examples sync with DTOs

**Rollback**: Remove `.claude/skills/openapi-spec-generation/`

## References

- API Docs Pattern: `.opencode/refs/api-docs-pattern.md`
- Skill Registry: `.atl/skill-registry.md` (API Documentation Patterns section)
- OpenSpec Change: `openspec/changes/feature/feature-swagger-skill/`