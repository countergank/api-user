---
priority: P1
category: data
---

# Wrap related writes in database transactions

**Do**: Use `QueryRunner` or `EntityManager.transaction()` to ensure multiple related writes succeed or fail atomically.
**Avoid**: Executing sequential `save()` or `insert()` calls without transaction isolation, which leaves partial data on failure.
**Example**:
```typescript
async transfer(fromId: string, toId: string, amount: number) {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();
  try {
    await queryRunner.manager.decrement(Account, { id: fromId }, { balance: amount });
    await queryRunner.manager.increment(Account, { id: toId }, { balance: amount });
    await queryRunner.commitTransaction();
  } catch {
    await queryRunner.rollbackTransaction();
    throw new Error('Transfer failed');
  } finally {
    await queryRunner.release();
  }
}
```
