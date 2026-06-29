---
priority: P1
category: security
---

# Sanitize user input beyond validation with escape libraries

**Do**: Use libraries like `sanitize-html` or `xss` to escape dangerous content in user-provided strings before storage or rendering.
**Avoid**: Relying solely on `class-validator` for security, which validates format but does not sanitize embedded scripts or HTML.
**Example**:
```typescript
import * as sanitizeHtml from 'sanitize-html';

@Injectable()
export class SanitizeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
    if (request.body.comment) {
      request.body.comment = sanitizeHtml(request.body.comment);
    }
    return next.handle();
  }
}
```
