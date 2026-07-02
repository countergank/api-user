---
priority: P2
category: testing
---

# Write contract tests for API request and response schemas

**Do**: Validate that API responses match expected DTO schemas using schema validation libraries or snapshot testing.
**Avoid**: Assuming API contracts are stable without automated verification, which causes breaking changes for downstream consumers.
**Example**:
```typescript
it('response matches CreateUserResponseDto schema', async () => {
  const response = await request(app.getHttpServer())
    .post('/users')
    .send({ email: 'test@example.com', name: 'Test' })
    .expect(201);

  expect(response.body).toHaveProperty('id');
  expect(response.body).toHaveProperty('email');
  expect(response.body).not.toHaveProperty('password');
});
```
