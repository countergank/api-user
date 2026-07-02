---
priority: P3
category: testing
---

# Run load tests for critical API endpoints

**Do**: Use tools like `k6`, `autocannon`, or `artillery` to simulate concurrent requests and measure response times, error rates, and throughput.
**Avoid**: Deploying to production without understanding how endpoints behave under load, especially for authentication and payment flows.
**Example**:
```javascript
// k6 load test
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = { vus: 100, duration: '30s' };

export default function () {
  const res = http.get('http://localhost:3000/users');
  check(res, { 'status is 200': (r) => r.status === 200 });
  check(res, { 'response < 200ms': (r) => r.timings.duration < 200 });
  sleep(1);
}
```
