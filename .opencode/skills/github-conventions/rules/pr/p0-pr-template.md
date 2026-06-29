---
priority: P0
category: pr
---

# Use a structured PR template for every pull request

**Do**: Fill out every required section of the PR template before requesting review: Summary, Changes, Testing, and (when applicable) Screenshots.
**Avoid**: Submitting empty templates, deleting sections, or writing "see commits" instead of a summary.
**Reference**: [GitHub Pull Request Templates](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/creating-a-pull-request-template-for-your-repository)

## Required Sections

| Section | Purpose | Required? |
|---------|---------|-----------|
| **Summary** | One-paragraph overview of what this PR does and why | Always |
| **Changes** | Bullet list of specific changes, grouped by area | Always |
| **Testing** | How to verify the changes work (steps, commands, test cases) | Always |
| **Screenshots / Recordings** | Visual proof for UI or UX changes | When UI is affected |

## Optional Sections

| Section | Purpose |
|---------|---------|
| **Related Issues** | Links to issues this PR addresses (use `Closes #123`) |
| **Breaking Changes** | Migration notes if this introduces a breaking change |
| **Checklist** | Author self-review items (lint, tests, docs updated) |

## Template Structure

```markdown
## Summary
[One paragraph: what this PR does and why it matters.]

## Changes
- **Area 1**: specific change description
- **Area 2**: specific change description

## Testing
1. [Step to verify]
2. [Command to run]
3. [Expected result]

## Screenshots
[Before/after images or screen recordings — delete if not applicable]

## Related Issues
Closes #123
```

**Examples**:
```
✅ Good: Summary explains the OAuth2 integration, Changes lists
         new files and modified routes, Testing includes curl commands.
❌ Bad:  Template is empty except for "Added OAuth login" in Summary.
❌ Bad:  "See commits for details" — the reviewer should not need to
         read the diff to understand intent.
```
