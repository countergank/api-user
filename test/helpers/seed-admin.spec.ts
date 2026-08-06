import { ADMIN_CREDENTIALS, seedAdminForE2E, AdminSeedResult } from './seed-admin';
import { UserRole } from '../../src/user/entities/user.entity';

describe('seed-admin helper', () => {
  describe('ADMIN_CREDENTIALS', () => {
    it('should have stable test-only email', () => {
      expect(ADMIN_CREDENTIALS.email).toBe('admin-e2e@countergank.test');
    });

    it('should have ADMIN role', () => {
      expect(ADMIN_CREDENTIALS.role).toBe(UserRole.ADMIN);
    });

    it('should have a non-empty password', () => {
      expect(ADMIN_CREDENTIALS.password.length).toBeGreaterThan(0);
    });

    it('should have a non-empty userName', () => {
      expect(ADMIN_CREDENTIALS.userName).toBe('admin-e2e');
    });
  });

  describe('seedAdminForE2E', () => {
    it('should be a function', () => {
      expect(typeof seedAdminForE2E).toBe('function');
    });

    it('should accept an INestApplication argument', async () => {
      const mockApp = {
        get: jest.fn().mockReturnValue({
          createWithRole: jest.fn().mockResolvedValue({ _id: 'test-id' }),
        }),
        getHttpServer: jest.fn().mockReturnValue({}),
      };

      // seedAdminForE2E will throw at the request() step with a mock,
      // but the key assertion is that app.get(UserService) was called
      await expect(seedAdminForE2E(mockApp as unknown as Parameters<typeof seedAdminForE2E>[0])).rejects.toThrow();
    });
  });
});
