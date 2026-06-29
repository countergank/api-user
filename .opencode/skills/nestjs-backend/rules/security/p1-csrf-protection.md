---
priority: P1
category: security
---

# Implement CSRF protection for state-changing requests

**Do**: Use `csurf` middleware or a NestJS CSRF guard to validate CSRF tokens on POST, PUT, PATCH, and DELETE requests.
**Avoid**: Accepting state-changing requests without CSRF validation when the application uses cookie-based sessions.
**Example**:
```typescript
import * as csurf from 'csurf';

app.use(csurf({ cookie: true }));

// In controller
@Post('transfer')
@UseGuards(CsrfGuard)
async transfer(@Body() dto: TransferDto) { ... }
```
