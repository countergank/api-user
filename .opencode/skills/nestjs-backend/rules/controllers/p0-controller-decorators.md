---
priority: P0
category: controllers
---

# Use HTTP method decorators with explicit paths

**Do**: Apply `@Get()`, `@Post()`, `@Put()`, `@Patch()`, `@Delete()` decorators with explicit route paths on controller methods.
**Avoid**: Using `@All()` for multiple HTTP methods or relying on implicit path inference from method names.
**Example**:
```typescript
@Controller('users')
export class UsersController {
  @Get(':id')
  findOne(@Param('id') id: string) { ... }

  @Post()
  create(@Body() dto: CreateUserDto) { ... }
}
```
