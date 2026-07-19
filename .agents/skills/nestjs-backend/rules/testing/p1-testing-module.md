---
priority: P1
category: testing
---

# Use Test.createTestingModule for dependency injection in tests

**Do**: Build test modules with `Test.createTestingModule()` that mirror production module configuration, overriding providers with mocks or test doubles.
**Avoid**: Manually instantiating services with `new` in tests, which bypasses NestJS DI and misses injection-related bugs.
**Example**:
```typescript
const module = await Test.createTestingModule({
  imports: [TypeOrmModule.forRoot(testConfig)],
  controllers: [UsersController],
  providers: [UsersService],
})
  .overrideProvider(EmailService)
  .useValue({ send: jest.fn() })
  .compile();
```
