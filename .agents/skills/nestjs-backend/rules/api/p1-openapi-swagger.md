---
priority: P1
category: api
---

# Document APIs with OpenAPI/Swagger decorators

**Do**: Use `@nestjs/swagger` decorators (`@ApiTags`, `@ApiOperation`, `@ApiResponse`, `@ApiProperty`) on controllers and DTOs to generate interactive API documentation.
**Avoid**: Shipping APIs without OpenAPI documentation, which blocks client code generation and increases integration friction.
**Example**:
```typescript
// main.ts
const document = SwaggerModule.createDocument(app, {
  title: 'API',
  version: '1.0',
});
SwaggerModule.setup('api/docs', app, document);

// DTO
export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;
}
```
