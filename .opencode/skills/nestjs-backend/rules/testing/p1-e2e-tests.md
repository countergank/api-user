---
priority: P1
category: testing
---

# Write E2E tests with supertest against a running test server

**Do**: Use `supertest` with `app.init()` to test full request-response cycles, including middleware, guards, pipes, and filters.
**Avoid**: Only writing unit tests and skipping integration tests, which miss wiring errors between modules.
**Example**:
```typescript
describe('UsersController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [UsersModule],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  it('POST /users creates a user', () => {
    return request(app.getHttpServer())
      .post('/users')
      .send({ email: 'test@example.com' })
      .expect(201);
  });

  afterAll(() => app.close());
});
```
