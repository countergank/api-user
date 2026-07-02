---
priority: P0
category: data
---

# Avoid N+1 queries — use relations or batch fetch

**Do**: Use `find({ relations: ['orders'] })` or `createQueryBuilder().leftJoinAndSelect()` to fetch related entities in a single query. For many-to-many, use `QueryBuilder` with joins.
**Avoid**: Calling `find()` or `findOne()` inside a `forEach()`, `map()`, or `for` loop, which produces one query per iteration.
**Example**:
```typescript
// One query with joined relations
const users = await this.userRepo.find({
  relations: ['orders', 'profile'],
});

// Bulk fetch by IDs instead of loop
const ids = [1, 2, 3];
const users = await this.userRepo.findByIds(ids);
```
