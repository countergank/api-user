---
priority: P0
category: architecture
---

# Define feature boundaries with modules

**Do**: Group related controllers, providers, and imports into cohesive `@Module()` units that represent a single feature or domain.
**Avoid**: Creating a single monolithic `AppModule` that imports everything, or scattering related providers across unrelated modules.
**Example**:
```typescript
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```
