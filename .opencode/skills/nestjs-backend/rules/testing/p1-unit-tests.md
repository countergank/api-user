---
priority: P1
category: testing
---

# Write unit tests for services with mocked dependencies

**Do**: Test each service in isolation by mocking its dependencies with Jest's `jest.fn()` or manual mock objects.
**Avoid**: Testing services with real database connections or external API calls, which makes tests slow and non-deterministic.
**Example**:
```typescript
describe('UsersService', () => {
  let service: UsersService;
  let repo: MockType<Repository<User>>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useFactory: repositoryMockFactory },
      ],
    }).compile();
    service = module.get(UsersService);
    repo = module.get(getRepositoryToken(User));
  });

  it('should create a user', async () => {
    repo.save.mockResolvedValue(mockUser);
    expect(await service.create(createUserDto)).toEqual(mockUser);
  });
});
```
