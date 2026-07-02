---
priority: P0
category: commit
---

# Use Conventional Commits 1.0.0 format

**Do**: Write every commit message in Conventional Commits format: `type(scope): description`, optionally followed by a blank line, body, and footer.
**Avoid**: Free-form commit messages, omitting the type, or using a colon without a proper type prefix.
**Reference**: [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)

## Structure

```
type(scope): description

[optional body]

[optional footer(s)]
```

### Header (required)

| Part | Rule |
|------|------|
| `type` | One of the 11 canonical types (see `p0-type-definitions.md`) |
| `scope` | Optional; lowercase-kebab-case area of the codebase (see `p1-scope-rules.md`) |
| `description` | Imperative mood, lowercase first letter, no period at end (see `p0-subject-line.md`) |

### Body (optional)

- Explains **what** changed and **why** (not *how* — the diff shows that).
- Wrap lines at 72 characters.
- Use paragraphs separated by a single blank line.

### Footer (optional)

- Contains metadata tokens: `BREAKING CHANGE`, `Closes #123`, `Refs #456`.
- Each footer on its own line, separated from body by a blank line.
- Multiple footers are allowed.

**Examples**:
```
feat(auth): add OAuth2 login with Google provider

Integrates passport-google-oauth20 strategy. Users can now sign in
with their Google account instead of email/password only.

Refs #42
```

```
fix(api): handle null user preferences without 500 error

BREAKING CHANGE: /api/preferences now returns {} instead of null
when no preferences are set.
```

```
docs(readme): add quickstart section for local development
```
