---
priority: P1
category: data
---

# Use batch operations for multiple inserts or updates

**Do**: Use `repo.save(entities[])` or `repo.insert(entities[])` with an array to persist multiple records in a single database round-trip.
**Avoid**: Calling `save()` or `insert()` inside a loop, which opens and closes a database connection per iteration.
**Example**:
```typescript
// One batch insert
const users = dto.items.map((item) =>
  this.userRepo.create({ name: item.name, email: item.email }),
);
await this.userRepo.save(users); // Single query

// NOT a loop
for (const item of dto.items) {
  await this.userRepo.save({ name: item.name }); // N queries
}
```
