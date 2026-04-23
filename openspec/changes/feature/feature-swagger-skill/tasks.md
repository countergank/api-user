## 1. Skill Installation

- [x] 1.1 Run `npx mdskills install sickn33/openapi-spec-generation`
- [x] 1.2 Verify skill directory exists in `.claude/skills/`

## 2. Verification

- [x] 2.1 Check SKILL.md content and structure
- [x] 2.2 Verify OpenCode lists skill in available_skills (verifiable in new session)
- [x] 2.3 Test loading skill via skill tool (verifiable in new session)

## 3. Documentation

- [x] 3.1 Document skill location and purpose in openspec
- [x] 3.2 Update skill-registry with API docs patterns
- [x] 3.3 Create `.opencode/refs/api-docs-pattern.md`
- [x] 3.4 Save pattern to engram memory

## 4. Pattern Details (NEW)

The following pattern was established and documented:

### Directory Structure
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

### Requirements
| Requirement | Description |
|-------------|-------------|
| Module-level | Documentation goes INSIDE each module, NOT in common/ |
| Examples required | Every endpoint MUST include request/response examples |
| Sync with DTOs | Examples MUST update when DTOs change |