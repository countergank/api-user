---
priority: P2
category: data
---

# Configure read replicas for read-heavy workloads

**Do**: Set up TypeORM replication with a primary writer and one or more read replicas, routing read queries to replicas via connection naming.
**Avoid**: Sending all queries to a single database instance when read traffic significantly exceeds write traffic.
**Example**:
```typescript
TypeOrmModule.forRoot({
  replication: {
    master: { host: 'primary.db.example.com', ... },
    slaves: [
      { host: 'replica1.db.example.com', ... },
      { host: 'replica2.db.example.com', ... },
    ],
  },
});
```
