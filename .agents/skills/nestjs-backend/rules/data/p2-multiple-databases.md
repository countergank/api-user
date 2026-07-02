---
priority: P2
category: data
---

# Use separate connections for multiple databases

**Do**: Configure multiple `TypeOrmModule.forRoot()` calls with distinct `name` properties and reference them with `@InjectConnection('name')`.
**Avoid**: Mixing entities from different databases in a single connection, which causes cross-database query failures.
**Example**:
```typescript
TypeOrmModule.forRoot({ name: 'users', ... }),
TypeOrmModule.forRoot({ name: 'analytics', ... }),

// In a service
@InjectConnection('analytics')
private readonly analyticsDb: Connection,
```
