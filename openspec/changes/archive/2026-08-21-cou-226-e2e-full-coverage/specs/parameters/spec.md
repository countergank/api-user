# Delta for parameters

## Reconciliation Note

The `parameters` capability is already fully specced by the unarchived change `parameter-admin-endpoint`:
- `openspec/changes/parameter-admin-endpoint/specs/parameter-admin/spec.md` — Admin API requirements
- `openspec/changes/parameter-admin-endpoint/specs/parameter-admin-controller/spec.md` — Endpoint contracts + scenarios

This change does NOT create duplicate delta specs. The e2e tests under `test/e2e/parameters/` will exercise the scenarios already defined in `parameter-admin-endpoint`. No additional requirement deltas are needed.

**E2E test scenarios to implement** (mapped to existing parameter-admin-endpoint specs):

| Test Scenario | Source Spec |
|--------------|-------------|
| Admin lists all parameters → 200 | parameter-admin-controller S1 |
| Admin filters by group → 200 | parameter-admin-controller S2 |
| Admin updates parameter → 200 | parameter-admin-controller S3 |
| Update rejects env-overridden → 409 | parameter-admin-controller S4 |
| Update rejects non-existent key → 404 | parameter-admin-controller S5 |
| Update rejects type mismatch → 422 | parameter-admin-controller S6 |
| Unauthenticated → 401 | parameter-admin-controller S7 |
| Non-admin → 403 | parameter-admin-controller S8 |
| Rate limit exceeded → 429 | parameter-admin-controller S9, S10 |
| Empty group → 200 [] | parameter-admin-controller S11 |
