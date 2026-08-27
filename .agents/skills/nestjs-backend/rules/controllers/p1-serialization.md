---
priority: P1
category: controllers
---

# Serialize responses with class-transformer interceptors

**Do**: Use `@UseInterceptors(ClassSerializerInterceptor)` and `@Expose()`/`@Exclude()` decorators to control which fields appear in API responses.
**Avoid**: Returning entity objects directly from controllers, which may expose internal fields like passwords or timestamps.
**Example**:
```typescript
@UseInterceptors(ClassSerializerInterceptor)
@Get(':id')
async findOne(@Param('id') id: string): Promise<UserResponseDto> {
  const user = await this.usersService.findOne(id);
  return plainToInstance(UserResponseDto, user);
}
```
