---
priority: P0
category: controllers
---

# Organize routes by resource with static-before-param ordering

**Do**: Place static routes (e.g., `@Get('stats')`) before parameterized routes (e.g., `@Get(':id')`) to prevent path conflicts.
**Avoid**: Defining `@Get(':id')` before `@Get('stats')`, which causes `stats` to be captured as an ID parameter.
**Example**:
```typescript
@Get('stats')        // matches /users/stats
getStats() { ... }

@Get(':id')          // matches /users/123
findOne(@Param('id') id: string) { ... }
```
