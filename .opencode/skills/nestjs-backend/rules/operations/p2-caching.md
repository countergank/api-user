---
priority: P2
category: operations
---

# Use CacheModule or Redis for response and query caching

**Do**: Apply `@nestjs/cache-manager` with `@UseInterceptors(CacheInterceptor)` and `@CacheTTL()` for frequently accessed, infrequently changing data.
**Avoid**: Recomputing expensive queries on every request when results are stable for a known time window.
**Example**:
```typescript
@Module({
  imports: [
    CacheModule.register({ ttl: 300, max: 100 }), // 5 minutes
  ],
})
export class AppModule {}

@Get('popular')
@CacheTTL(600)
async getPopular() { ... }
```
