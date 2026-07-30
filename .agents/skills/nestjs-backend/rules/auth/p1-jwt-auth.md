---
priority: P1
category: auth
---

# Implement JWT authentication with Passport strategy

**Do**: Create a `JwtStrategy` extending `PassportStrategy(Strategy)` that validates tokens and attaches the decoded user to the request.
**Avoid**: Manually parsing and verifying JWT tokens in middleware or controller methods instead of using Passport's standardized flow.
**Example**:
```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({ jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), secretOrKey: config.jwtSecret });
  }

  async validate(payload: JwtPayload) {
    return { userId: payload.sub, email: payload.email };
  }
}
```
