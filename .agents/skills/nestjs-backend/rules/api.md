# API — Priority P1–P2

Read this file when the task documents an API surface, shapes error responses, or paginates list endpoints. P1 rules apply to every API; P2 applies when a route returns a collection.

## P1 — Document every route and response type with OpenAPI decorators

Decorate controllers and DTOs with `@nestjs/swagger` decorators (`@ApiTags`, `@ApiOperation`, `@ApiResponse`, `@ApiProperty`) and serve the generated document with `SwaggerModule.setup`, so the API ships interactive OpenAPI documentation for client code generation. Declare `@ApiResponse({ status, type, description })` for every possible HTTP response of a route handler, including error responses.

```typescript
// ✅ main.ts document setup, DTO property docs, and every response declared
const document = SwaggerModule.createDocument(app, { title: 'API', version: '1.0' });
SwaggerModule.setup('api/docs', app, document);
export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' }) @IsEmail() email: string;
}
@Get(':id')
@ApiResponse({ status: 200, type: UserResponseDto })
@ApiResponse({ status: 404, description: 'User not found' })
```

```typescript
// ❌ Undocumented DTOs and responses break OpenAPI generation and client codegen
@Get(':id')
async findOne(@Param('id') id: string): Promise<UserResponseDto> {
  return this.users.findOne(id);
}
```

## P1 — Return one error shape from a global exception filter

Handle exceptions in a global exception filter that returns one standardized shape `{ statusCode, message, error, timestamp, path }`, so clients parse a single error format instead of raw exception messages or inconsistent structures.

```typescript
// ✅ One filter maps every HttpException to the standardized shape
@Catch(HttpException)
export class HttpExceptionFilter extends BaseExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp(); const status = exception.getStatus();
    ctx.getResponse().status(status).json({
      statusCode: status, message: exception.message, error: exception.constructor.name,
      timestamp: new Date().toISOString(), path: ctx.getRequest().url,
    });
  }
}
```

```typescript
// ❌ Raw exception messages force clients to handle multiple error formats
catch(exception: HttpException, host: ArgumentsHost) {
  ctx.getResponse().json(exception.message);
}
```

## P2 — Paginate list endpoints with bounded result sets

Accept `page`, `limit`, `offset`, or `cursor` query parameters on list endpoints and return paginated results with metadata (`total`, `page`, `hasNext`), keeping result sets bounded instead of growing indefinitely as data accumulates.

```typescript
// ✅ Bounded window plus metadata for the client
@Get()
async findAll(
  @Query('page') page = 1,
  @Query('limit') limit = 20,
): Promise<PaginatedResult<User>> {
  const [items, total] = await this.repo.findAndCount({ skip: (page - 1) * limit, take: limit });
  return { items, total, page, limit, hasNext: page * limit < total };
}
```

```typescript
// ❌ Unbounded result set that grows with the table
@Get()
async findAll(): Promise<User[]> {
  return this.repo.find();
}
```
