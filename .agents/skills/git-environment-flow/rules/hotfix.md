# Hotfix — Priority P1

Read this file when production is broken and the fix cannot wait for the next release.

## P1 — Branch from main, tag a patch, backmerge to develop

A hotfix starts from `main`, never from `develop` or `staging`, because the fix has to apply to what production runs. It merges to `main` with an annotated patch tag (`v1.2.0` → `v1.2.1`), then `main` backmerges to `develop` so integration does not drift. `staging` receives the fix through the next release branch cut from `develop`, never through a direct merge — that keeps the curation model intact.

```text
main ──branch──▶ hotfix/description ──merge+tag──▶ main ──backmerge──▶ develop
                                                        └─▶ staging catches up in the next release/x.y.z cut from develop
```

1. **Branch from `main`** — `hotfix/<description>` off the current production state.
2. **Merge to `main`** — after review, with an annotated patch tag.
3. **Backmerge to `develop`** — one merge, no separate staging merge.
4. **Staging catches up** — through the next `release/x.y.z` cut from `develop`.

### What a hotfix skips, and what it never skips

This is the single owner of the exception. A `hotfix/*` branch skips the **staging curation path**; it never skips review or CI. The pull request to `main` still needs one approving reviewer and passing status checks, exactly like any other protected merge.

The tradeoff holds because a hotfix is small, targeted and reviewed before it lands. The scope is the promotion path and nothing else: if a hotfix could bypass review, an emergency would become a way to merge unreviewed code into production. `rules/environment.md` and `rules/promotion.md` reference this section and never restate it.

```text
// ✅ Hotfix off main, patch tag, backmerge, staging catches up next release
git switch -c hotfix/session-expiry main
git tag -a v1.2.1 -m "Release 1.2.1 - 2026-10-29"
// ❌ Hotfix from develop, merged straight to staging, or tagged as a minor bump
git switch -c hotfix/session-expiry develop
git tag -a v1.3.0 -m "Release 1.3.0 - 2026-10-29"
```
