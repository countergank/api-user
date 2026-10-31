# Controllers — Priority P0–P1

Read this file when writing or refactoring NestJS controllers: route ordering, decorator composition, controller file layout, and response serialization.

## P0 — Register static routes before parameterized routes

Place static routes (e.g., `@Get('stats')`) before parameterized routes (e.g., `@Get(':id')`) to prevent path conflicts.

```typescript
// ✅ Static route declared first, so /users/stats matches getStats
@Get('stats')
getStats() { ... }

@Get(':id')
findOne(@Param('id') id: string) { ... }
```

```typescript
// ❌ @Get(':id') declared first captures 'stats' as an ID parameter
@Get(':id')
findOne(@Param('id') id: string) { ... }

@Get('stats')
getStats() { ... } // unreachable: /users/stats matches the param route
```

## P1 — Compose endpoint decorators and keep one folder per feature

Group related decorators (guards, interceptors, Swagger) into a single composed decorator with `applyDecorators()`, keeping each controller handler to at most 3-4 decorators. Composed endpoint decorators live in `common/decorators/endpoints/<feature>.decorator.ts`, one file per resource (e.g., `user-endpoint.decorator.ts`, `admin-endpoint.decorator.ts`). Organize each feature as one folder (e.g., `src/users/`, `src/orders/`) containing its controller, service, and module, with a `dto/` subfolder, one file per resource, so unrelated features stay decoupled.

```typescript
// ✅ src/users/ holds users.controller.ts, users.service.ts, users.module.ts, dto/;
//    the composed decorator lives in common/decorators/endpoints/auth-endpoint.decorator.ts
export const AuthEndpoint = (summary: string) =>
  applyDecorators(
    ApiOperation({ summary }),
    ApiBearerAuth(),
    UseGuards(JwtAuthGuard),
    ApiResponse({ status: 200 }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
  );
```

```typescript
// ❌ Five stacked decorators repeated on every route handler
@Get(':id')
@ApiOperation({ summary: 'Get user by ID' })
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiResponse({ status: 200 })
@ApiResponse({ status: 401, description: 'Unauthorized' })
async findOne(@Param('id') id: string) { ... }
```

## P1 — Serialize responses instead of returning entities

Control which fields appear in API responses with `@UseInterceptors(ClassSerializerInterceptor)` and the `@Expose()`/`@Exclude()` decorators, returning response DTO instances instead of entity objects.

```typescript
// ✅ Serialized response shaped through UserResponseDto
@UseInterceptors(ClassSerializerInterceptor)
@Get(':id')
async findOne(@Param('id') id: string): Promise<UserResponseDto> {
  const user = await this.usersService.findOne(id);
  return plainToInstance(UserResponseDto, user);
}
```

```typescript
// ❌ Returning the entity exposes internal fields like passwords or timestamps
@Get(':id')
async findOne(@Param('id') id: string) {
  return this.usersService.findOne(id);
}
```
