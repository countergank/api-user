# Comment only when the body stops a reader

**Do**: leave code self-sufficient and comment only when the body stops a reader for one of the two signals below.
**Avoid**: file-header banners, section labels, `TODO` without an owner, ticket IDs, PR references or priority tags, and comments that restate the code.

## The two signals

1. **Nesting** — a control block inside another control block.
2. **Hidden effect** — the function writes, deletes, sends, or mutates something outside its return value, and the name does not announce it.

No signal, no comments. Length alone is not complexity.

## Fires

```ts
if (batch.isEmpty()) {
  // An empty batch here would stall the retry loop below
  continue;
}

// Writes to `audit_log`; the name does not announce it
export async function sendPasswordReset(email: string): Promise<void>

// Mutates `entries` in place and returns only the survivors
export function compactCache(entries: CacheEntry[]): CacheEntry[]

for (const row of rows) {
  if (!row.ownerId) {
    // Orphan rows are reassigned to the system account further down
    continue;
  }
}
```

## Does not fire

```ts
export async function createUser(db: Db, input: NewUser): Promise<User>   // name announces the write
export function formatCurrency(cents: number, currency: Currency): string // name and types say it
export function handleSubmit(): void                                      // delegates to mutate()
export function toggle(isOpen: boolean): void                             // flat, no hidden effect
```

## Never

```ts
// USER SERVICE                 ← banner
// ---- validation ----         ← section label
// TODO: make this faster       ← TODO without an owner
counter++;                      // Increment the counter
```
