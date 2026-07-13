# Exploration: Coverage Thresholds + CSRF Waiver

**Change**: `coverage-csrf-waiver`
**Linear**: COU-117 (Cycle 5: Test coverage + CSRF waiver)
**Date**: 2026-07-08

## Current State

### WS-7: Test Coverage

The project has **no `coverageThreshold`** configured in `package.json` Jest config. Coverage collection exists but is purely informational — there is no gate preventing coverage regression.

**Coverage baseline** (from `npm run test:cov`, 42 test suites, 359 tests):

| Metric | Current |
|--------|---------|
| Statements | 56.2% |
| Branches | 50.42% |
| Functions | 40.48% |
| Lines | 56.42% |

**`collectCoverageFrom`** has a syntax bug: `test/**/*.{t|j)s` should be `test/**/*.{t|j}s` (missing closing brace). This means test files are incorrectly included in coverage collection.

**CI gap**: The `.github/workflows/release-ghcr.yml` workflow builds and pushes Docker images but does **not** run tests or collect coverage. There is no coverage gate in CI at all.

### WS-8: CSRF Analysis

**No CSRF protection exists** and none is needed. Here's why:

1. **Auth is JWT Bearer only**: `jwt.strategy.ts` uses `ExtractJwt.fromAuthHeaderAsBearerToken()` — tokens are sent in the `Authorization: Bearer <token>` header.
2. **No cookies anywhere**: Grep for `cookie`, `setCookie`, `@fastify/csrf` across all `.ts` files returns **zero results**.
3. **CORS credentials: false**: `main.ts` line 32 — `app.enableCors({ origin: originsArray, credentials: false })` — browsers will NOT send credentials cross-origin.
4. **Refresh token flow**: `POST /auth/refresh` accepts `{ refreshToken: "..." }` in the request **body**, not in a cookie. Both `accessToken` and `refreshToken` are returned as JSON in the response body.
5. **No `@fastify/csrf` dependency**: Not listed in `package.json` dependencies.

**CSRF requires browser-sent credentials** (cookies, HTTP auth). Since this API:
- Uses Bearer tokens (manually attached by client, not auto-sent by browser)
- Sets `credentials: false` on CORS
- Never sets cookies
- Returns tokens in JSON body (client must store and attach manually)

**CSRF attacks are not applicable to this architecture.**

## Affected Areas

- `package.json` — add `coverageThreshold`, fix `collectCoverageFrom` glob pattern
- `.github/workflows/release-ghcr.yml` — optionally add test/coverage step (out of scope for this cycle, but noted)
- No CSRF files to modify — this is a documentation-only decision

## Approaches

### WS-7: Coverage Thresholds

#### Approach 1: Conservative thresholds (recommended)
Set thresholds just below current baseline to establish a floor without breaking CI:

```json
"coverageThreshold": {
  "global": {
    "statements": 55,
    "branches": 45,
    "functions": 35,
    "lines": 55
  }
}
```

- **Pros**: Safe, won't break existing tests, establishes regression floor
- **Cons**: Low bar, doesn't drive improvement
- **Effort**: Low

#### Approach 2: Aspirational thresholds
Set higher targets to drive coverage improvement:

```json
"coverageThreshold": {
  "global": {
    "statements": 70,
    "branches": 60,
    "functions": 55,
    "lines": 70
  }
}
```

- **Pros**: Drives real improvement, aligns with industry standards
- **Cons**: Will fail CI immediately (359 tests would need significant additions), blocks merges
- **Effort**: High (requires writing many new tests)

#### Approach 3: Per-file thresholds
Set thresholds only on critical modules (auth, user service):

```json
"coverageThreshold": {
  "src/auth/**/*.ts": { "statements": 80, "branches": 70 },
  "src/user/service/**/*.ts": { "statements": 75 }
}
```

- **Pros**: Targets critical code, ignores decorators/decorators files
- **Cons**: Complex to maintain, Jest per-file thresholds have limitations
- **Effort**: Medium

### WS-8: CSRF Waiver

#### Approach 1: Document the waiver (recommended)
Add a CSRF waiver note to the security spec or create a `SECURITY.md` section explaining why CSRF is not needed.

- **Pros**: Accurate, no code changes, no performance impact
- **Cons**: Requires future developers to understand the reasoning
- **Effort**: Low (documentation only)

#### Approach 2: Add CSRF protection anyway
Install `@fastify/csrf` and add CSRF token validation to all non-GET routes.

- **Pros**: Defense in depth
- **Cons**: **Wrong for this architecture** — would break all API clients, adds complexity for no security benefit, clients would need to fetch CSRF tokens before every mutation
- **Effort**: High (and unnecessary)

## Recommendation

### WS-7: Approach 1 (Conservative thresholds)
Set thresholds slightly below current baseline. This establishes a **regression floor** — coverage can never drop below these numbers without CI failing. Future cycles can raise the bar incrementally.

**Fix the `collectCoverageFrom` glob** simultaneously: change `"test/**/*.{t|j)s"` to exclude test files from coverage (test files should not count toward coverage).

### WS-8: Approach 1 (Document the waiver)
Add a CSRF waiver to the security spec. The API is genuinely not vulnerable to CSRF because it uses Bearer token auth with no cookies. Adding CSRF protection would be security theater that breaks clients.

## Risks

- **WS-7**: Conservative thresholds may create a false sense of security. Coverage numbers don't measure test quality. Mitigation: pair with mutation testing or review-focused test quality checks in future cycles.
- **WS-7**: Fixing `collectCoverageFrom` to exclude test files may slightly **lower** the reported percentages (test files currently inflate coverage). Thresholds should account for this.
- **WS-8**: If the project ever adds cookie-based auth (e.g., httpOnly refresh tokens), CSRF protection MUST be added at that time. The waiver document should note this condition.

## Files to Modify/Create

| File | Action | Reason |
|------|--------|--------|
| `package.json` | Modify | Add `coverageThreshold`, fix `collectCoverageFrom` glob |
| `openspec/specs/security/spec.md` | Modify | Add CSRF waiver requirement + scenarios |
| `openspec/changes/chore/coverage-csrf-waiver/exploration.md` | Create | This document |

## Ready for Proposal

**Yes.** Both workstreams are well-understood:
- WS-7: Add conservative coverage thresholds + fix glob pattern in `package.json`
- WS-8: Document CSRF waiver in security spec (no code changes needed)
