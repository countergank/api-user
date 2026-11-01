# Labels — Priority P0

Read this file when you label a ticket.

## P0 — Apply one type label and at least one component label

The label set is confirmed, singular and in English. Every ticket takes one type, which says what kind of work it is, and at least one component, which says which area it touches, so a board filter returns the whole slice without reading titles.

| Type | Use |
|------|-----|
| `bug` | Broken behaviour being corrected |
| `feature` | New visible capability |
| `spike` | Investigation or deliverable framing |
| `chore` | Maintenance, tooling, configuration |

| Component | Use |
|-----------|-----|
| `api` | Backend, endpoints |
| `ui` | Interface, frontend |
| `docs` | Documentation |
| `infra` | Infrastructure, CI/CD |

Never pluralise (`bugs`, `features`) and never encode state as a label (`done`, `in-progress`): the board's `Status` field owns the state, and a second copy in the labels is the copy that disagrees. Do not invent a label outside this set without approval; an unapproved label fragments the filter it was meant to serve. The set is tooling, so it stays in English even when the ticket content is in another language.

```text
// ✅ One type, one or more components, singular and in English
bug, ui
feature, api
chore, infra
```

```text
// ❌ State as a label, plurals, or an invented label
done, in-progress
bugs, varios
crítico, urgente
```
