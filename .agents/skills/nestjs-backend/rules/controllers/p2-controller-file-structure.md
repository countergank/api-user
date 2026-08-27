---
priority: P2
category: controllers
---

# Keep controllers focused with a feature-based directory structure

**Do**: Organize controllers per feature module, with decorators, guards, and DTOs in dedicated subdirectories. Each controller method should have at most 3-4 decorators (compose the rest).
**Avoid**: Monolithic controllers with 200+ lines of decorator stacking. Extract cross-cutting decorators into `common/decorators/`.
**Example**:
```
src/users/
├── users.controller.ts       # Lean handlers
├── users.service.ts
├── users.module.ts
└── dto/
    ├── create-user.dto.ts
    └── user-response.dto.ts

src/common/decorators/
├── current-user.decorator.ts
└── endpoints/
    └── user-endpoint.decorator.ts
```
