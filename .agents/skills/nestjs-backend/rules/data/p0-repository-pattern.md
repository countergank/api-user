---
priority: P0
category: data
---

# Use the repository pattern to abstract data access

**Do**: Create custom repository classes or use `Repository<T>` injected via `TypeOrmModule.forFeature()` to encapsulate all database queries.
**Avoid**: Writing raw SQL or query builder calls directly in services, which couples business logic to the database implementation.
**Example**:
```typescript
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersService],
})
export class UsersModule {}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}
}
```
