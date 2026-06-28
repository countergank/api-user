---
priority: P1
category: controllers
---

# Extract request data with custom param decorators

**Do**: Create custom param decorators in `common/decorators/` for `@CurrentUser()`, `@RequestId()`, or `@Permissions()` instead of extracting from `@Req()` inline.
**Avoid**: Accessing `request.user` or `request.headers` directly in controller methods, which couples controller logic to the HTTP layer.
**Example**:
```typescript
// common/decorators/current-user.decorator.ts
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

// In controller
@Get('profile')
getProfile(@CurrentUser() user: User) {
  return user;
}
```
