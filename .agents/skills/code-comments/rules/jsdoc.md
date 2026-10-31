# Write classic JSDoc with types when the signal fires

**Do**: Write a classic JSDoc block — description, every `@param {Type} name - ...`, `@returns {Type}`, `@throws {ErrorType}`, and a line for side effects — exactly when the nesting or hidden-effect signal fires.
**Avoid**: Typeless JSDoc, partial blocks that skip parameters, and `{Type}` values that disagree with the TypeScript signature.

## Block contents

```ts
/**
 * Closes an account and notifies its owner.
 *
 * @param {string} id - Account to close; must be in `active` state.
 * @param {CloseReason} reason - Why it closes; stored on the audit row.
 * @returns {Promise<Account>} The account as persisted after closing.
 * @throws {AccountClosedError} When the account was already closed.
 * @throws {AccountNotFoundError} When no account has that id.
 *
 * Side effect: sends a closure email and writes one row to `audit_log`.
 */
export async function closeAccount(id: string, reason: CloseReason): Promise<Account> {
```

## Types match the signature

The `{Type}` in JSDoc must match the TypeScript signature. On mismatch the code wins and the JSDoc is a bug: fix the JSDoc, never bend the signature to satisfy the comment.

```
❌ Bad:  @param {number} id  on  closeAccount(id: string, ...)
✅ Good: @param {string} id  on  closeAccount(id: string, ...)
```

No signal, no JSDoc — this rule never licenses comments on self-sufficient code.
