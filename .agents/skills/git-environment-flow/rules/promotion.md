# Promotion — Priority P0

Read this file when deciding which branch a change targets, or how code reaches production.

## P0 — Promote left to right, never right to left

Code moves through the chain in one direction: features merge to `develop`; a release branch is cut from `develop`; that same release branch merges to `staging` for curation and then to `main` for production; finally `main` backmerges to `develop`. `staging` is a testing mirror and never the source of `main`.

```text
feature ──PR(squash)──▶ develop ──cut──▶ release/x.y.z ──▶ staging  (vX.Y.Z-rcN)
                            ▲                  │
                            │                  └────────▶ main     (vX.Y.Z)
                            └──────────── backmerge ────────────────┘
```

1. **Feature → `develop`** — squash merge through a pull request. All feature work integrates here first.
2. **`develop` → `release/x.y.z`** — branch cut at scope freeze. Only bugfixes are allowed afterwards.
3. **`release/x.y.z` → `staging`** — merge for curation testing and tag `vX.Y.Z-rcN`.
4. **`release/x.y.z` → `main`** — after curation approval, merge and tag `vX.Y.Z` (annotated).
5. **`main` → `develop`** — backmerge so integration does not drift from production, then delete the release branch.

Feature pull requests are squashed to keep history readable; release merges are standard merges that preserve the full history for traceability. Both `staging` and `main` receive the same release content, which is why `staging` never has to merge upward. The backmerge is mandatory: skipping it makes the next release cut ship a `develop` that never saw the production fixes.

```text
// ✅ One direction: feature to develop, release to staging and main, main back to develop
feat/login ──squash──▶ develop ──▶ release/1.2.0 ──▶ staging (v1.2.0-rc1) + main (v1.2.0) ──▶ develop
// ❌ Skipping an environment, or merging right to left
feat/login ──▶ staging
staging ──▶ main
develop ──▶ main              (no release branch, no tag, no backmerge)
```
