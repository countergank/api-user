# API Documentation Pattern

## CRITICAL Rules

1. **Module-level ONLY** - Documentation goes INSIDE each module, NOT in common/
2. **Examples REQUIRED** - Every endpoint MUST include request and response examples
3. **Sync with DTOs** - Examples MUST update when DTOs change

---

## Directory Structure

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

## Example: User Module

```
src/user/
├── controller/
│   └── user.controller.ts
└── api-docs/
    ├── index.ts
    ├── decorators.ts
    └── examples/
        ├── create.request.ts
        ├── create.response.ts
        ├── update.request.ts
        └── update.response.ts
```

---

## Decorator Function Pattern

### ❌ WRONG (inline, no examples)

```typescript
@ApiOperation({ summary: 'Create a user' })
@ApiResponse({ status: 201, type: CreateUserResponseDTO })
@Post()
create(@Body() dto: CreateUserDTO) { ... }
```

### ✅ CORRECT (decorator function with examples)

```typescript
// src/user/controller/user.controller.ts
import { applyUserDocs } from '../api-docs';

@Post()
@applyUserDocs('create')
create(@Body() dto: CreateUserDTO) { ... }
```

```typescript
// src/user/api-docs/decorators.ts
import { createUserRequestExample } from './examples/create.request';
import { createUserResponseExample } from './examples/create.response';

export function applyUserDocs(method: 'create' | 'update' | 'getById') {
  const docs = {
    create: {
      operation: { summary: 'Create a new user' },
      response: { status: 201, type: CreateUserResponseDTO, examples: { '0': { value: createUserResponseExample } } },
      body: { type: CreateUserDTO, examples: { '0': { value: createUserRequestExample } } },
    },
    // ... otros métodos
  };

  return applyDecorators(
    ApiOperation(docs[method].operation),
    ApiResponse(docs[method].response),
    ApiBody(docs[method].body),
  );
}
```

---

## Example Files Pattern

### Request Example

```typescript
// src/{module}/api-docs/examples/create.request.ts
export const createUserRequestExample = {
  email: 'john@example.com',
  password: 'securePassword123',
  name: 'John Doe',
};
```

### Response Example

```typescript
// src/{module}/api-docs/examples/create.response.ts
export const createUserResponseExample = {
  id: 'usr_abc123',
  email: 'john@example.com',
  name: 'John Doe',
  createdAt: '2026-04-22T10:00:00Z',
};
```

---

## Key Principles

1. **Cohesion** - Docs live with the module they document
2. **Examples** - Always include realistic request/response examples
3. **Reusability** - Decorator functions can be reused across endpoints
4. **Maintainability** - Examples in one place, easy to update

---

## References
- Skill Registry: `.atl/skill-registry.md`
- OpenSpec: `openspec/changes/feature/feature-swagger-skill/specs/`