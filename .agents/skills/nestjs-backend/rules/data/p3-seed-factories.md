---
priority: P3
category: data
---

# Create seed factories for deterministic test data

**Do**: Use TypeORM factories or Prisma seed scripts with Faker.js to generate consistent, reproducible test datasets for development and CI.
**Avoid**: Manually inserting test data via SQL scripts or relying on production data copies for testing.
**Example**:
```typescript
define(UserEntity, (faker: typeof Faker) => {
  const user = new UserEntity();
  user.email = faker.internet.email();
  user.name = faker.person.fullName();
  return user;
});

// In seed script
await UserFactory.createMany(50);
```
