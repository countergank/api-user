---
priority: P2
category: auth
---

# Authenticate API requests with API keys for service-to-service calls

**Do**: Create an `ApiKeyGuard` that validates a header or query parameter against a stored key hash, suitable for machine-to-machine authentication.
**Avoid**: Using JWT tokens for service-to-service communication when long-lived API keys with scoped permissions are more appropriate.
**Example**:
```typescript
@Injectable()
export class ApiKeyGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];
    const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const record = await this.apiKeyRepo.findOne({ where: { keyHash: hash } });
    return !!record && record.isActive;
  }
}
```
