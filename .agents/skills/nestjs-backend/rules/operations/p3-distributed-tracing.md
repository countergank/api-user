---
priority: P3
category: operations
---

# Implement distributed tracing with OpenTelemetry

**Do**: Use OpenTelemetry instrumentation to propagate trace IDs across service boundaries and export spans to a collector (Jaeger, Zipkin, or cloud provider).
**Avoid**: Debugging multi-service requests without trace context, which requires manual log correlation across services.
**Example**:
```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({ url: 'http://jaeger:4318/v1/traces' }),
});
sdk.start();
```
