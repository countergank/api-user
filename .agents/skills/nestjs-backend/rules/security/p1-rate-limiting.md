---
priority: P1
category: security
---

# Apply rate limiting to prevent brute-force attacks

**Do**: Use `@nestjs/throttler` or express-rate-limit middleware to cap requests per IP or per user within a time window.
**Avoid**: Leaving login, registration, or password-reset endpoints without rate limits, enabling credential stuffing.
**Example**:
```typescript
@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60, limit: 10 }]),
  ],
})
export class AppModule {}

@Throttle({ default: { limit: 5, ttl: 60 } })
@Post('login')
async login(@Body() dto: LoginDto) { ... }
```
