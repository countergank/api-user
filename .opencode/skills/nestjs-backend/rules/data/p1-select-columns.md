---
priority: P1
category: data
---

# Select only needed columns — avoid SELECT *

**Do**: Use `select` in `find()` options or `.select(['field'])` in `QueryBuilder` to fetch only the columns required by the current operation.
**Avoid**: Fetching all columns (`SELECT *`) when only 2-3 fields are needed, especially on tables with large text, JSON, or BLOB columns.
**Example**:
```typescript
// Fetch only id and name for a dropdown list
const users = await this.userRepo.find({
  select: ['id', 'name'],
});

// QueryBuilder equivalent
const users = await this.userRepo
  .createQueryBuilder('user')
  .select(['user.id', 'user.name'])
  .getMany();
```
