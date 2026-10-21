---
priority: P1
category: controllers
---

# Validate DTOs with ValidationPipe

**Do**: Register a global `ValidationPipe` with `transform: true` and `whitelist: true` in `main.ts`. This is the norm and covers every controller route by default.
**Exception**: Apply `ValidationPipe` with `@UsePipes()` at the route level only for a documented reason, such as a single endpoint that needs stricter or different validation options than the global pipe. Do not repeat the pipe per route as a habit.
**Avoid**: Manually validating DTO fields in the controller or accepting untyped `any` request bodies.
**Example** (documented route-level exception):
```typescript
// Route-level exception: this endpoint needs different validation
// options than the global ValidationPipe provides.
@Post()
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
async create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
  return this.usersService.create(dto);
}
```
