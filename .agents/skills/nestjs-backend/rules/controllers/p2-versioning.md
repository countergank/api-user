---
priority: P2
category: controllers
---

# Version APIs with URI or header-based versioning

**Do**: Use `@Controller({ version: '1' })` or `VersioningType.URI` in `main.ts` to support multiple API versions simultaneously.
**Avoid**: Breaking existing clients by changing response shapes without versioning, or maintaining separate codebases per version.
**Example**:
```typescript
app.enableVersioning({
  type: VersioningType.URI,
  defaultVersion: '1',
});

@Controller({ version: '2', path: 'users' })
export class UsersV2Controller { ... }
```
