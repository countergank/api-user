# Delta for health-check

## Test Coverage Note

The health-check requirements (HLTH-01..HLTH-03) are already fully specced in `openspec/specs/health-check/spec.md`. No requirement delta is needed.

**E2E test gap**: `GET /health` currently has no e2e test. The following scenarios MUST be added to `test/e2e/app/health.e2e-spec.ts`:

| Scenario | Maps to Requirement |
|----------|-------------------|
| Healthy app returns 200 with status "ok" and database "up" | HLTH-01, HLTH-02 |
| No auth header required (public endpoint) | HLTH-01 |
| Response is valid JSON with Content-Type application/json | HLTH-01 |

These test cases exercise existing requirements; they do not change them.
