---
priority: P2
category: operations
---

# Expose health check endpoints for liveness and readiness

**Do**: Use `@nestjs/terminus` to implement `/health` endpoints that verify database connectivity, external service availability, and memory usage.
**Avoid**: Deploying without health checks, which prevents orchestrators from detecting and recovering from unhealthy instances.
**Example**:
```typescript
@Get('health')
@HealthCheck()
async healthCheck() {
  return this.health.check([
    () => this.db.pingCheck('database'),
    () => this.memory.checkHeap('memory_heap', 200 * 1024 * 1024),
  ]);
}
```
