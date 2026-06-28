---
priority: P1
category: data
---

# Configure Prisma with generated types and NestJS integration

**Do**: Use `@prisma/client` with generated TypeScript types and create a `PrismaService` extending `PrismaClient` that connects on module init and disconnects on shutdown.
**Avoid**: Importing `PrismaClient` directly in controllers or services without lifecycle management, which causes connection leaks.
**Example**:
```typescript
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}
```
