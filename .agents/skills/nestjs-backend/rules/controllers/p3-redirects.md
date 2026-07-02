---
priority: P3
category: controllers
---

# Use @Redirect for server-side URL redirections

**Do**: Apply `@Redirect(url, statusCode)` decorator or return `{ url, statusCode }` from the handler for HTTP redirects.
**Avoid**: Manually setting `Location` headers and status codes when the `@Redirect` decorator handles both.
**Example**:
```typescript
@Get('legacy/users')
@Redirect('/api/v2/users', 301)
redirectLegacy() {
  return; // NestJS handles the redirect
}
```
