# Archive Report: cou-223-refactor-test-directory

**Date**: 2026-08-18
**Status**: ✅ Complete (verdict PASS)
**Ticket**: COU-223 (Linear, In Progress — closing deferred to orchestrator after PR #393 merge)
**Branch**: feature/cou-223-refactor-test-directory
**PR**: #393 (open against develop)

## Executive Summary

Refactored the test directory structure and removed httpyac. E2E specs reorganized into `test/e2e/{domain}/`, dead/orphaned test files deleted, a bounded `audit-poll` helper replaced fixed `setTimeout` sleeps in audit-logs e2e specs, and duplicate `GET /users/profile` tests were deduplicated to a single canonical spec. All suites verified green at close: unit 717/717, helpers 8/8, e2e 68/68.

## Final State (authoritative — supersedes intermediate snapshots)

- **Verification**: PASS. 0 blockers, 0 CRITICAL findings. 7/7 requirements, 10/10 scenarios compliant (per verify-report).
- **Tests at close**: `npm run test:unit` 717/717 (67 suites), `npm run test:helpers` 8/8, `npm run test:e2e -- --runInBand` 68/68 (8 suites) — re-verified green after the verify-report was persisted.
- **Working tree**: clean at branch HEAD `50cfe29`.
- **Tasks**: 15/15 complete.
- **Commits (9)**: `7bcbef2` base unrelated; COU-223 commits `caa2a69`, `e9addbe`, `68e6f99`, `529cb00`, `355a6ab`, `4494631`, `0e79607`, `6a0d558`, `50cfe29`.

## Root Cause Fix (audit-logs e2e failures)

The 2 audit-logs e2e failures were NOT flakiness — an action-name mismatch: the controller emitted `REGISTER`/`LOGIN` while the convention is `auth.register`/`auth.login`. Fixed in commit `6a0d558` (`src/auth/auth.controller.ts`). This was a spec-required production change within a test-only refactor (recorded as a WARNING-scope deviation in verify-report, not a blocker).

## Engram Artifacts Read (traceability)

| Artifact | Observation ID |
|----------|----------------|
| exploration | #1451 |
| proposal | #1452 |
| spec | #1453 |
| design | #1455 |
| tasks | #1456 |
| apply-progress | #1457 |
| verify-report | #1461 |
| verification discovery | #1462 |

## Task Completion Gate

T8.3 (e2e 68/68) was marked `- [ ]` (blocked) in the stale tasks.md and apply-progress, both written while Docker/Mongo/Redis were unavailable locally. Final-state reconciliation performed at archive time, authorized by the orchestrator's final-state facts and proven by verify-report #1461: e2e 68/68 verified green against docker-compose Mongo+Redis. Checkbox ticked; reason recorded here.

## Specs Synced

| Domain | Action | Details |
|--------|--------|---------|
| e2e-test-harness | Updated | ETH-01 modified (location note); ETH-08..ETH-13 added (6 requirements); scenarios ETH-S01 updated, ETH-S08..ETH-S16 added |

## Archive Contents

- proposal.md ✅
- exploration.md ✅
- specs/e2e-test-harness/spec.md ✅
- design.md ✅
- tasks.md ✅ (15/15 complete)
- apply-progress.md ✅
- verify-report.md ✅
- archive-report.md ✅

## Not Done / Deferred

- Linear COU-223 ticket close: deferred to orchestrator after PR #393 merge (explicit instruction).
- Push / PR creation: not performed (explicit instruction).

## Warnings Carried Forward (non-blocking)

1. `npm run build` exits 1 in this environment: `dist/` root-owned (stale Docker build artifact). Compile-level build proven clean (declared build command exit 0). Cleanup: `sudo rm -rf dist`.
2. Pre-existing biome lint items in `test/e2e/audit-logs/audit-logs.e2e-spec.ts` (duplicate beforeAll hook, unused `adminUser`); CI lints `./src` only.
3. Ghost-loop risk at audit-logs.e2e-spec.ts:99-101/110-112 (pre-existing, not touched by this change) — SUGGESTION for future work.