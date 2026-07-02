---
priority: P2
category: operations
---

# Expose Prometheus metrics for monitoring

**Do**: Use `@willsoto/nestjs-prometheus` to expose `/metrics` with HTTP request duration, error rates, and custom business metrics.
**Avoid**: Running production services without observability, which makes incident detection and capacity planning impossible.
**Example**:
```typescript
@Module({
  imports: [
    PrometheusModule.register({ path: 'metrics', defaultMetrics: true }),
  ],
})
export class AppModule {}

// Custom metric
@InjectMetric(Counter)
private readonly requestCounter: Counter<string>;

this.requestCounter.inc({ route: '/users', method: 'POST' });
```
