---
priority: P1
category: api
---

# Return consistent error response formats

**Do**: Use a global exception filter that returns errors in a standardized shape: `{ statusCode, message, error, timestamp, path }`.
**Avoid**: Returning raw exception messages or inconsistent error structures that force clients to handle multiple error formats.
**Example**:
```typescript
@Catch(HttpException)
export class HttpExceptionFilter extends BaseExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const status = exception.getStatus();
    ctx.getResponse().status(status).json({
      statusCode: status,
      message: exception.message,
      timestamp: new Date().toISOString(),
      path: ctx.getRequest().url,
    });
  }
}
```
