---
priority: P1
category: auth
---

# Compose guards for layered authorization

**Do**: Stack multiple guards with `@UseGuards(JwtAuthGuard, RolesGuard)` to enforce authentication first, then authorization, in the order listed.
**Avoid**: Combining authentication and authorization logic into a single guard, which makes testing and reuse difficult.
**Example**:
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Delete(':id')
async remove(@Param('id') id: string) {
  return this.usersService.remove(id);
}
```
