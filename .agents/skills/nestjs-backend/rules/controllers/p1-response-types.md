---
priority: P1
category: controllers
---

# Declare explicit response types for API documentation

**Do**: Use `@ApiResponse({ status, type, description })` decorators to document every possible HTTP response from a route handler.
**Avoid**: Leaving response types undocumented, which breaks OpenAPI/Swagger generation and client code generation.
**Example**:
```typescript
@Get(':id')
@ApiResponse({ status: 200, type: UserResponseDto })
@ApiResponse({ status: 404, description: 'User not found' })
async findOne(@Param('id') id: string): Promise<UserResponseDto> { ... }
```
