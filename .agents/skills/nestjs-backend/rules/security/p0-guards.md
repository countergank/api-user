---
priority: P0
category: security
---

# Protect routes with guards implementing CanActivate

**Do**: Create guards that implement `CanActivate` and apply them with `@UseGuards()` at the controller or method level for authentication and authorization.
**Avoid**: Checking authentication manually inside controller methods or assuming routes are protected without explicit guards.
**Example**:
```typescript
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);
    request.user = await this.jwtService.verifyAsync(token);
    return true;
  }
}
```
