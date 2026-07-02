---
priority: P1
category: controllers
---

# Validate DTOs with ValidationPipe at the route level

**Do**: Apply `ValidationPipe` with `transform: true` and `whitelist: true` via `@UsePipes()` or globally in `main.ts`.
**Avoid**: Manually validating DTO fields in the controller or accepting untyped `any` request bodies.
**Example**:
```typescript
@Post()
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
async create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
  return this.usersService.create(dto);
}
```
