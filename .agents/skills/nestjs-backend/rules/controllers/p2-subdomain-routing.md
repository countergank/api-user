---
priority: P2
category: controllers
---

# Use sub-domain routing for multi-tenant applications

**Do**: Configure `HOST` header matching with `@Controller({ host: ':tenant.example.com' })` to route requests by subdomain.
**Avoid**: Parsing subdomain names from the request body or URL path when sub-domain routing is more appropriate.
**Example**:
```typescript
@Controller({ host: ':tenant.api.example.com' })
export class TenantController {
  @Get()
  getTenant(@HostParam('tenant') tenant: string) { ... }
}
```
