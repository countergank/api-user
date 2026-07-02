---
priority: P1
category: pr
---

# Link issues using GitHub keywords

**Do**: Use GitHub keywords (`Closes`, `Fixes`, `Resolves`) in PR descriptions or commit footers to automatically close related issues when the PR merges.
**Avoid**: Manually closing issues after merge, forgetting to link issues entirely, or using non-keyword phrases like "this fixes" that GitHub does not recognize.
**Reference**: [Linking a Pull Request to an Issue](https://docs.github.com/en/issues/tracking-your-work-with-issues/linking-a-pull-request-to-an-issue)

## GitHub Keywords

| Keyword | Behavior |
|---------|----------|
| `Closes #123` | Closes issue #123 when PR merges |
| `Fixes #123` | Same as Closes (preferred for bug fixes) |
| `Resolves #123` | Same as Closes (preferred for feature requests) |

### Placement

Keywords work in:
- **PR description** (most common — visible to reviewers)
- **Commit footer** (one per commit, or on the squash commit)
- **Commit body** (less visible but still functional)

### Cross-Referencing

To reference an issue **without** closing it, use:
- `Refs #123` — creates a link but does not auto-close.
- `See #123` — informal reference (no auto-close, no link in some contexts).

### Multiple Issues

Link multiple issues on separate lines:
```
Closes #42
Closes #43
Refs #50
```

**Examples**:
```
✅ Good: PR description includes "Closes #42"
✅ Good: Commit footer: "Refs #78"
❌ Bad:  "this should fix issue 42"              ← not a recognized keyword
❌ Bad:  Issue #42 is still open after merge     ← keyword was missing
```
