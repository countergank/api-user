import { ExecutionContext } from '@nestjs/common';
import { extractUser } from './extract-user.helper';

describe('extractUser (pure function)', () => {
  const createMockContext = (user: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  it('should extract user from request when guard has attached it', () => {
    const mockUser = { id: 'user-123', email: 'test@test.com', name: 'Test' };
    const ctx = createMockContext(mockUser);

    const result = extractUser(null, ctx);

    expect(result).toEqual(mockUser);
    expect(result.id).toBe('user-123');
    expect(result.email).toBe('test@test.com');
  });

  it('should return undefined when no guard has attached a user', () => {
    const ctx = createMockContext(undefined);
    const result = extractUser(null, ctx);

    expect(result).toBeUndefined();
  });

  it('should return the full User entity, not just JWT payload', () => {
    const fullUser = {
      id: 'user-456',
      email: 'full@test.com',
      name: 'Full',
      lastName: 'User',
      password: 'hashed',
      role: 'admin',
      isActive: true,
    };
    const ctx = createMockContext(fullUser);
    const result = extractUser(null, ctx);

    expect(result).toEqual(fullUser);
    expect(result).toHaveProperty('password');
    expect(result).toHaveProperty('role');
    expect(result).toHaveProperty('isActive');
  });
});
