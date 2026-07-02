---
priority: P2
category: api
---

# Use GraphQL for complex data fetching requirements

**Do**: Integrate `@nestjs/graphql` with Apollo or Mercurius when clients need flexible queries, nested data fetching, or real-time subscriptions.
**Avoid**: Building REST endpoints that return deeply nested, over-fetched data or requiring clients to make N+1 requests for related resources.
**Example**:
```typescript
@Module({
  imports: [
    GraphQLModule.forRoot({
      autoSchemaFile: 'schema.gql',
      playground: true,
    }),
  ],
})
export class AppModule {}

@Resolver(() => User)
export class UserResolver {
  @Query(() => User)
  async user(@Args('id') id: string) { ... }
}
```
