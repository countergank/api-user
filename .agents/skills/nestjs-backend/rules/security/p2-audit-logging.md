---
priority: P2
category: security
---

# Log security-relevant events for audit trails

**Do**: Emit structured log entries for authentication attempts, authorization failures, permission changes, and data access to sensitive resources.
**Avoid**: Logging only application errors while ignoring security events that are critical for incident investigation.
**Example**:
```typescript
@Injectable()
export class AuditService {
  logAccess(user: User, resource: string, action: string) {
    this.logger.log({
      event: 'access',
      userId: user.id,
      resource,
      action,
      timestamp: new Date().toISOString(),
    });
  }
}
```
