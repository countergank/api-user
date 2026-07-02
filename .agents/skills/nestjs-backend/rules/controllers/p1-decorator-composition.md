---
priority: P1
category: controllers
---

# Compose decorators with applyDecorators to keep controllers lean

**Do**: Group related decorators (guards, interceptors, Swagger) into a single composed decorator using `applyDecorators()` in a separate `common/decorators/` file.
**Avoid**: Stacking 5+ decorators on every route handler, which makes controllers unreadable and hard to maintain.
**Example**:
```typescript
// common/decorators/auth-endpoint.decorator.ts
export const AuthEndpoint = (summary: string) =>
  applyDecorators(
    ApiOperation({ summary }),
    ApiBearerAuth(),
    UseGuards(JwtAuthGuard),
    ApiResponse({ status: 200 }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
  );

// In controller — one decorator instead of five
@Get(':id')
@AuthEndpoint('Get user by ID')
async findOne(@Param('id') id: string) { ... }
```
