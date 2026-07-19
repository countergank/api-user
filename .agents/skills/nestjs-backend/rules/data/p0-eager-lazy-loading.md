---
priority: P0
category: data
---

# Configure relation loading explicitly — avoid global eager

**Do**: Set `eager: false` on all `@OneToMany()` and `@ManyToMany()` relations by default. Use `relations: […]` or `leftJoinAndSelect()` in repository queries to opt in to loading only when needed.
**Avoid**: Setting `eager: true` on relations globally, which causes every query to join all related tables regardless of whether the data is used.
**Example**:
```typescript
// Entity — eager off by default
@OneToMany(() => Order, (order) => order.user, { eager: false })
orders: Order[];

// Query — explicit opt-in
const user = await this.userRepo.findOne({
  where: { id },
  relations: ['orders'], // Only load orders when needed
});
```
