---
priority: P2
category: commit
---

# Mark breaking changes clearly

**Do**: Signal breaking changes with the `!` suffix on the type (`feat!:` or `fix!:`) AND include a `BREAKING CHANGE` footer that describes the impact and any migration steps.
**Avoid**: Introducing breaking changes without clear signals, burying them in a regular commit, or omitting migration guidance.
**Reference**: [Conventional Commits — Breaking Changes](https://www.conventionalcommits.org/en/v1.0.0/#commit-message-with--to-draw-attention-to-breaking-change)

## Signaling Methods

### Header Suffix (visible in `git log --oneline`)

```
feat(api)!: change response format from array to object
```

The `!` immediately after the type (before the colon) signals a breaking change at a glance.

### Footer (detailed description)

```
BREAKING CHANGE: /api/users now returns { data: [...] } instead of [...].
Clients must unwrap the response array from the data key.
```

### Both Together (recommended)

Use **both** the `!` suffix and the footer for maximum visibility.

## Migration Notes

When introducing a breaking change:
1. Describe **what** changed in the `BREAKING CHANGE` footer.
2. Provide **migration steps** — how should consumers adapt?
3. Consider a **deprecation period** — warn before breaking, then break in a later release.

**Examples**:
```
feat(api)!: change preferences endpoint response shape

BREAKING CHANGE: /api/preferences returns { data: {} } instead of
raw object. Unwrap from the data key.

Migration:
  Before: const prefs = await fetch('/api/preferences')
  After:  const { data: prefs } = await fetch('/api/preferences')

Closes #91
```

```
refactor(auth)!: remove deprecated token format

BREAKING CHANGE: Tokens issued before v2.0 are no longer valid.
Users must re-authenticate to receive new-format tokens.
```
