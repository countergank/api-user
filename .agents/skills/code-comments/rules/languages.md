# Same threshold in every language

**Do**: apply the identical two-signal threshold — nesting and hidden effects — to Go doc comments, Python docstrings, and YAML manifest comments.
**Avoid**: treating a language switch as license for banners, restating comments, or tracker references.

## Equivalents

- **JS/TS** — classic JSDoc with `{Type}` values matching the signature (`rules/jsdoc.md`).
- **Go** — doc comment directly above the exported declaration; an unannounced side effect is the only reason to go beyond one sentence.
- **Python** — docstring with the same two signals; state writes, deletes, or sends outside the return value.
- **YAML** — comment only what the manifest cannot say, such as why a replica count is pinned below the quota.

## Examples

```python
# ✅ Hidden effect: mutates the queue in place
def flush_metrics(queue):
    """Drains the queue and POSTs each batch to the collector.

    Side effect: empties `queue`; returns only the shipped count.
    """
```

```go
// ❌ A doc comment that restates the signature
// GetUser returns the user with the given id.
func GetUser(id string) (*User, error)

// ✅ No comment: the signature already says it
func GetAccount(id string) (*Account, error)

// ✅ Hidden effect: writes `audit_log`; the name does not announce it
//
// Fetch reads the user and records the access in the audit log.
func (c *Client) Fetch(ctx context.Context, id string) (*User, error) {
	defer c.audit.Record(ctx, id)
	return c.store.Get(ctx, id)
}
```
