---
priority: P0
category: pr
---

# Write reviewable PR titles and descriptions

**Do**: Use a Conventional Commits-style PR title (`type(scope): description`), write a description that explains what changed and why, and keep each PR to a single logical change.
**Avoid**: Vague titles like "fixes" or "updates", descriptions that only say "see commits", and PRs that mix unrelated changes (e.g., a bug fix + a refactor + a feature).
**Reference**: [GitHub Best Practices for Pull Requests](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/getting-started/best-practices-for-pull-requests)

## PR Title Format

```
type(scope): Imperative description
```

- Follow the same conventions as commit subjects (see `p0-subject-line.md`).
- Match the dominant commit type if the PR contains multiple commits.

## Description Structure

1. **What** — one paragraph summarizing the change.
2. **Why** — the problem this solves or the feature it enables.
3. **How** — key implementation decisions (optional, only when non-obvious).
4. **Verification** — steps or commands to test the change.

## Single Logical Change Rule

Each PR should address **one concern only**:
- A bug fix PR should not also refactor unrelated code.
- A feature PR should not also fix typos across the codebase.
- If a PR does two things, split it into two PRs.

**Examples**:
```
✅ Good Title: feat(auth): add Google OAuth2 login
✅ Good Title: fix(api): handle null preferences without 500
❌ Bad Title:  fixes and improvements
❌ Bad Title:  update stuff
❌ Bad Title:  WIP
```
