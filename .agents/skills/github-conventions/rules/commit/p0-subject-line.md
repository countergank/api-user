---
priority: P0
category: commit
---

# Write a clear imperative subject line

**Do**: Keep the commit subject to a 50-character summary (72 characters absolute maximum), use imperative mood, start the description in lowercase, and omit the trailing period.
**Avoid**: Vague subjects like "fix stuff" or "update files", past tense ("fixed", "added"), and subjects that run past 72 characters.
**Reference**: [How to Write a Git Commit Message](https://cbea.ms/git-commit/)

## Seven Rules

1. **Separate subject from body with a blank line** — tools (git log, GitHub) use the first line as the summary.
2. **Limit the subject to 50 characters** — ideal length for readability in `git log --oneline` and PR views.
3. **Start the description in lowercase** — "fix: add retry" not "fix: Add retry" (Conventional Commits 1.0.0 requires a lowercase description after the type/scope).
4. **Do not end the subject with a period** — it is a title, not a sentence.
5. **Use the imperative mood** — "fix bug" not "fixed bug" or "fixes bug". Read it as a command: "If applied, this commit will *fix bug*."
6. **Wrap the body at 72 characters** — terminal and GitHub diff viewers truncate long lines.
7. **Use the body to explain what and why, not how** — the diff shows how.

## Subject Line Format

```
type(scope): imperative description here
```

The description portion (after `type(scope): `) should:
- Start with a **lowercase letter** (Conventional Commits 1.0.0 requires the description to be lowercase).
- Be **concise** — aim for ≤ 50 characters total including the `type(scope): ` prefix.
- Never end with a period.

**Examples**:
```
✅ Good: feat(auth): add Google OAuth2 login
✅ Good: fix(api): return empty object for missing preferences
✅ Good: docs(readme): add quickstart section
❌ Bad:  feat(auth): Added Google OAuth2 login.   ← capitalized + past tense + period
❌ Bad:  fix: fix the thing that was broken       ← vague, no scope
❌ Bad:  update the user model to support fields  ← no type prefix
```
