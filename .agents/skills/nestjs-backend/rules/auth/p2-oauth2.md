---
priority: P2
category: auth
---

# Implement OAuth2 with Passport social strategies

**Do**: Use `@nestjs/passport` with provider-specific strategies (`PassportStrategy(GoogleStrategy)`, etc.) and handle the OAuth2 callback to exchange codes for tokens.
**Avoid**: Implementing OAuth2 flows manually with HTTP clients, which misses edge cases like state validation and token refresh.
**Example**:
```typescript
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({ clientID: config.googleClientId, clientSecret: config.googleSecret, callbackURL: '/auth/google/callback' });
  }

  async validate(accessToken: string, refreshToken: string, profile: Profile) {
    return { email: profile.emails[0].value, provider: 'google' };
  }
}
```
