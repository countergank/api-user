# Data — Priority P0–P1

TypeORM database access: relation loading, query shape, schema changes, transactions, and write batching. Read it when a task touches repositories, entities, queries, or schema.

## P0 — Load relations explicitly, never eagerly

Set `eager: false` on `@OneToMany()` and `@ManyToMany()` relations by default, and opt in to loading with `relations: […]` or `leftJoinAndSelect()` in repository queries, so each query joins only the related tables its data is used by.

```ts
// ✅ Entity relation with eager off by default
@OneToMany(() => Order, (order) => order.user, { eager: false })
orders: Order[];
```

```ts
// ❌ Global eager joins every related table on every query
@OneToMany(() => Order, (order) => order.user, { eager: true })
orders: Order[];
```

## P0 — Fetch related rows in one query

Fetch related entities in a single query with `find({ relations: ['orders'] })`, `createQueryBuilder().leftJoinAndSelect()`, or `findByIds(ids)` for bulk fetch by IDs; for many-to-many, use `QueryBuilder` with joins. Issue one query per operation instead of calling `find()` or `findOne()` inside a `forEach()`, `map()`, or `for` loop, which produces one query per iteration. Snippets live inside a repository, never in a service.

```ts
// ✅ One query with joined relations
const users = await this.userRepo.find({
  relations: ['orders', 'profile'],
});
const ids = [1, 2, 3];
const byId = await this.userRepo.findByIds(ids);
```

```ts
// ❌ One query per iteration
for (const id of ids) {
  const user = await this.userRepo.findOne({ where: { id } });
}
```

## P1 — Change the schema with migrations, never with synchronize

Generate and run migrations with `typeorm migration:generate` and `migration:run` for all schema changes, including in CI/CD pipelines, and keep `synchronize: false` in production TypeORM config so an application restart never rewrites the schema from the entities.

```ts
// ✅ ormconfig.ts — schema changes go through migrations
{
  synchronize: false, // Always false in production
  migrations: ['src/migrations/*.ts'],
  migrationsRun: true, // Auto-run on startup
}
```

```ts
// ❌ synchronize rewrites the schema on restart and can drop columns
{
  synchronize: true, // data loss on restart
}
```

## P1 — Wrap related writes in one transaction

Use `QueryRunner` or `EntityManager.transaction()` for multiple related writes so they succeed or fail atomically; sequential `save()` or `insert()` calls without transaction isolation leave partial data behind when a later step fails.

```ts
// ✅ Both balance updates commit together or roll back together
async transfer(fromId: string, toId: string, amount: number) {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();
  try {
    await queryRunner.manager.decrement(Account, { id: fromId }, { balance: amount });
    await queryRunner.manager.increment(Account, { id: toId }, { balance: amount });
    await queryRunner.commitTransaction();
  } catch {
    await queryRunner.rollbackTransaction();
    throw new Error('Transfer failed');
  } finally {
    await queryRunner.release();
  }
}
```

```ts
// ❌ Sequential writes leave partial data on failure
await this.accountRepo.decrement(Account, { id: fromId }, { balance: amount });
await this.accountRepo.increment(Account, { id: toId }, { balance: amount });
```

## P1 — Batch writes and select only needed columns

Persist multiple records in a single database round-trip with `repo.save(entities[])` or `repo.insert(entities[])`, and fetch only the columns the operation uses with `select` in `find()` options or `.select(['field'])` in `QueryBuilder`. One round trip replaces a `save()` or `insert()` per iteration, which opens and closes a database connection each time, and a narrow select avoids reading large text, JSON, or BLOB columns the operation never touches.

```ts
// ✅ One round trip, only the columns the operation uses
const users = dto.items.map((item) =>
  this.userRepo.create({ name: item.name, email: item.email }),
);
await this.userRepo.save(users); // Single query
const list = await this.userRepo.find({ select: ['id', 'name'] });
const rows = await this.userRepo
  .createQueryBuilder('user')
  .select(['user.id', 'user.name'])
  .getMany();
```

```ts
// ❌ One query per iteration, and every column fetched
for (const item of dto.items) {
  await this.userRepo.save({ name: item.name }); // N queries
}
const all = await this.userRepo.find(); // SELECT * on wide tables
```
