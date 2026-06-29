---
priority: P2
category: controllers
---

# Organize endpoint decorators in feature-specific files

**Do**: Place composed endpoint decorators in `common/decorators/endpoints/<feature>.decorator.ts`, one file per resource (e.g., `user-endpoint.decorator.ts`, `admin-endpoint.decorator.ts`).
**Avoid**: Defining endpoint decorators in the controller file itself or in a single monolithic decorator file.
**Example**:
```
common/decorators/endpoints/
├── public-endpoint.decorator.ts
├── auth-endpoint.decorator.ts
├── user-endpoint.decorator.ts
└── admin-endpoint.decorator.ts
```
