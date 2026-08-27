---
priority: P2
category: api
---

# Implement cursor or offset-based pagination for list endpoints

**Do**: Accept `page`, `limit`, `offset`, or `cursor` query parameters and return paginated results with metadata (`total`, `page`, `hasNext`).
**Avoid**: Returning unbounded result sets that grow indefinitely as data accumulates, causing memory and latency issues.
**Example**:
```typescript
@Get()
async findAll(
  @Query('page') page = 1,
  @Query('limit') limit = 20,
): Promise<PaginatedResult<User>> {
  const [items, total] = await this.repo.findAndCount({
    skip: (page - 1) * limit,
    take: limit,
  });
  return { items, total, page, limit, hasNext: page * limit < total };
}
```
