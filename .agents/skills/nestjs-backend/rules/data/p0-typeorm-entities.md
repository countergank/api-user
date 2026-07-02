---
priority: P0
category: data
---

# Define TypeORM entities with explicit column types and relations

**Do**: Use `@Entity()`, `@Column()`, `@PrimaryGeneratedColumn()`, and relation decorators (`@OneToMany`, `@ManyToOne`) with explicit types and constraints.
**Avoid**: Using `any` types for entity properties or omitting relation cascade configurations, which causes orphaned records.
**Example**:
```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255, unique: true })
  email: string;

  @OneToMany(() => Order, (order) => order.user, { cascade: true })
  orders: Order[];
}
```
