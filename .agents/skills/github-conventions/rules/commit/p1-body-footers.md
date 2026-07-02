---
priority: P1
category: commit
---

# Use body and footers for context and metadata

**Do**: Write a body that explains the motivation behind the change (not the mechanics), wrap lines at 72 characters, and use footer tokens for structured metadata like `BREAKING CHANGE`, `Closes #123`, or `Refs #456`.
**Avoid**: Repeating the diff in the body, writing bodies for trivial one-line changes, or placing footers on the same line as body text.
**Reference**: [Conventional Commits — Footer](https://www.conventionalcommits.org/en/v1.0.0/#specification)

## Body Guidelines

- Explain **why** the change was needed and **what** approach was taken.
- The diff already shows *how* — do not narrate line-by-line changes.
- Wrap each line at **72 characters** for terminal and GitHub readability.
- Separate paragraphs with a single blank line.
- Omit the body for trivial changes (typo fixes, single-line corrections).

## Footer Tokens

| Token | Purpose | Format |
|-------|---------|--------|
| `BREAKING CHANGE` | Signals a SemVer major bump | `BREAKING CHANGE: description of impact` |
| `Closes` / `Fixes` / `Resolves` | Closes a GitHub issue | `Closes #123` |
| `Refs` | References an issue without closing | `Refs #456` |
| `Co-authored-by` | Credits a collaborator | `Co-authored-by: Name <email>` |

### Footer Rules

1. Separate the body from footers with **one blank line**.
2. Each footer on its **own line**.
3. Multiple footers are allowed — one per line.
4. `BREAKING CHANGE` can also appear in the header with `!` suffix (see `p2-breaking-changes.md`).

**Examples**:
```
refactor(auth): extract token validation to separate module

The validation logic was tightly coupled to the route handler,
making it difficult to test and reuse. Extracted into a
dedicated service with clear input/output contracts.

Refs #78
```

```
fix(api): return 404 for missing resources instead of 500

The error handler was catching NotFoundError as a generic
exception. Now it maps to the correct HTTP status.

BREAKING CHANGE: clients expecting 500 for missing resources
must update their error handling to check for 404.

Closes #91
```
