# Proposal: Fix Broken E2E Test Harness

## Intent

32 of 38 e2e tests fail across 9 suites — NOT regressions from COU-209. Four pre-existing harness issues: Express adapter in i18n specs crashes `AuditInterceptor.response.raw.on('finish')`, no admin seeding, hardcoded low rate limits exhaust in parallel runs, and empty roles/permissions tables.

## Scope

### In Scope
- Migrate 4 i18n e2e specs (`test/e2e/i18n/*.e2e-spec.ts`) from Express to Fastify via `createTestApp()`
- Seed at least one admin user available to specs that require admin access
- Raise rate-limit env vars in `test/jest.setup.ts` so parallel suites don't exhaust them
- Ensure roles/permissions tables are populated before e2e run (seed or beforeAll bootstrap)

### Out of Scope
- Rewriting existing passing tests
- Refactoring `AuditInterceptor` (it's correct for Fastify)
- Changing production rate limits

## Capabilities

### New Capabilities
- `e2e-test-harness`: Documents the e2e bootstrap contract — Fastify adapter, admin seed, rate-limit thresholds, and DB prerequisites required for a green `make test:e2e`

### Modified Capabilities
- None (no spec-level requirement changes; this is a test harness fix)

## Approach

1. **Fastify adapter (4 files)**: Replace `moduleFixture.createNestApplication()` with `createTestApp()` import + call in all i18n e2e specs. Pattern already proven by 7 other working specs.
2. **Admin seeding**: Add a `seedAdminForE2E()` helper called from specs that need admin access. Registers a user with ADMIN role or seeds directly into the DB.
3. **Rate limits**: Raise `jest.setup.ts` limits — LOGIN_THROTTLE_LIMIT → 20, REGISTER_THROTTLE_LIMIT → 30, THROTTLE_LIMIT → 30, FORGOT_PASSWORD_THROTTLE_LIMIT → 15. TTL stays at 60s.
4. **DB prerequisites**: Ensure `test/jest.setup.ts` or a global beforeAll seeds `roles` and `permissions` collections if empty.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `test/e2e/i18n/*.e2e-spec.ts` | Modified | Switch to `createTestApp()` (Fastify) |
| `test/jest.setup.ts` | Modified | Raise rate-limit env vars |
| `test/helpers/` | New | `seed-admin.ts` helper |
| `src/common/audit/audit.interceptor.ts` | None | Correct as-is (Fastify-only) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Rate limits still too low for full suite | Low | Monitor `make test:e2e`; bump further if needed |
| Admin seed collides with existing DB state | Low | Use idempotent upsert pattern |

## Rollback Plan

Revert `jest.setup.ts` env values and i18n spec imports. Admin seed helper is additive — no rollback needed beyond deleting the file.

## Dependencies

- MongoDB running locally with `api_user` database (existing requirement)
- `createTestApp()` helper at `test/helpers/create-test-app.ts` (already exists)

## Success Criteria

- [ ] `make test:e2e` passes green: 0 failures, 0 errors
- [ ] No Express-default adapter in any `*.e2e-spec.ts` file
- [ ] Admin-seeded specs pass authorization checks
- [ ] Doc updated for running e2e locally (seed step documented)
