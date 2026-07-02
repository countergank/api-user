---
priority: P1
category: commit
---

# Name commit scopes consistently

**Do**: Use lowercase-kebab-case for scopes, keep them short (1-3 words), and use the same scope names consistently across commits that touch the same area.
**Avoid**: Mixing naming conventions (`auth` vs `authentication`), using overly broad scopes (`app`, `all`), or inventing new scope names for existing areas.
**Reference**: [Conventional Commits — Scope](https://www.conventionalcommits.org/en/v1.0.0/#specification)

## Scope Naming Rules

1. **Lowercase kebab-case** — `user-preferences`, not `UserPreferences` or `user_preferences`.
2. **Be specific** — `auth` is better than `backend`; `login` is better than `auth` when the change is login-specific.
3. **Stay consistent** — if the codebase uses `api`, do not switch to `server` or `backend`.
4. **Omit when unclear** — if no single scope applies, omit the scope entirely: `feat: add dark mode support`.

## Common Scope Patterns

| Area | Scope Examples |
|------|----------------|
| Authentication | `auth`, `login`, `oauth`, `jwt` |
| API layer | `api`, `routes`, `handlers`, `controllers` |
| Data layer | `db`, `models`, `repository`, `migrations` |
| UI/Frontend | `ui`, `components`, `styles`, `layout` |
| Configuration | `config`, `env`, `settings` |
| Testing | `tests`, `e2e`, `fixtures` |

**Examples**:
```
✅ Good: feat(auth): add Google OAuth2 provider
✅ Good: fix(api): handle null preferences
✅ Good: docs: update contribution guidelines      ← no scope (global change)
❌ Bad:  feat(Authentication): add Google login    ← uppercase
❌ Bad:  fix(app): fix the broken thing            ← too broad
❌ Bad:  feat(user-prefs): add dark mode           ← inconsistent with existing `preferences` scope
```
