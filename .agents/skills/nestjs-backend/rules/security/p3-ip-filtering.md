---
priority: P3
category: security
---

# Filter requests by IP address for sensitive endpoints

**Do**: Implement an IP-based guard or middleware that checks the request IP against an allowlist or blocklist for admin or internal endpoints.
**Avoid**: Exposing administrative endpoints to the public internet without network-level access controls.
**Example**:
```typescript
@Injectable()
export class IpGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip;
    const allowed = this.config.get<string[]>('ALLOWED_IPS', []);
    return allowed.includes(ip);
  }
}
```
