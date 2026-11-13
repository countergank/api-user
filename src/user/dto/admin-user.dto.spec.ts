import { AdminUserDTO } from './admin-user.dto';
import { AdminUserDetailDTO } from './admin-user-detail.dto';
import { UserMock } from '../mocks/user.mock';
import { UserRole } from '../entities/user.entity';

describe(AdminUserDTO.name, () => {
  describe('account lock state (COU-261)', () => {
    it('exposes lockedUntil and failedLoginAttempts of a locked account', () => {
      const lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      const user = new UserMock();
      user.id = 'user-1';
      user.failedLoginAttempts = 5;
      user.lockedUntil = lockedUntil;

      const dto = AdminUserDTO.of(user);

      expect(dto.failedLoginAttempts).toBe(5);
      expect(dto.lockedUntil).toBe(lockedUntil.toISOString());
    });

    it('reports a never-locked account as lockedUntil=null and failedLoginAttempts=0', () => {
      // A fresh document: `UserMock` never initializes `failedLoginAttempts`, so the
      // property is absent at runtime and the DTO has to map that absence (COU-320).
      // Asserted, not assumed: if the fixture ever initializes the field, this case must
      // fail loudly instead of silently testing something else.
      const user = new UserMock();
      expect(user.failedLoginAttempts).toBeUndefined();
      user.lockedUntil = undefined;

      const dto = AdminUserDTO.of(user);

      expect(dto.lockedUntil).toBeNull();
      expect(dto.failedLoginAttempts).toBe(0);
    });

    it('keeps the previously exposed fields unchanged', () => {
      const user = new UserMock();
      user.id = 'user-2';
      user.role = UserRole.ADMIN;
      user.failedLoginAttempts = 2;

      const dto = AdminUserDTO.of(user);

      expect(dto.id).toBe('user-2');
      expect(dto.name).toBe(user.name);
      expect(dto.lastName).toBe(user.lastName);
      expect(dto.email).toBe(user.email);
      expect(dto.userName).toBe(user.userName);
      expect(dto.role).toBe(UserRole.ADMIN);
      expect(dto.isActive).toBe(true);
    });
  });

  describe('avatarUrl (issue #548)', () => {
    it('exposes the resolved public URL passed by the caller', () => {
      const user = new UserMock();
      const resolved = '/uploads/avatars/507f1f77bcf86cd799439011-1700000000000.png';

      const dto = AdminUserDTO.of(user, resolved);

      expect(dto.avatarUrl).toBe(resolved);
    });

    it('leaves avatarUrl undefined for a user without photo', () => {
      const user = new UserMock();
      expect(user.avatarUrl).toBeUndefined();

      expect(AdminUserDTO.of(user).avatarUrl).toBeUndefined();
    });

    it('never falls back to the raw stored object key', () => {
      const user = new UserMock();
      user.avatarUrl = 'avatar/507f1f77bcf86cd799439011-1700000000000.png';

      expect(AdminUserDTO.of(user).avatarUrl).toBeUndefined();
    });
  });

  describe('account state (issue #535)', () => {
    it('reports a user without tokens as verified with no pending changes', () => {
      // A fresh document: `UserMock` never initializes the state tokens, so the
      // properties are absent at runtime and the DTO maps absence as the settled
      // state (COU-320). Asserted, not assumed.
      const user = new UserMock();
      expect(user.emailVerificationToken).toBeUndefined();
      expect(user.pendingEmailToken).toBeUndefined();
      expect(user.resetPasswordToken).toBeUndefined();

      const dto = AdminUserDTO.of(user);

      expect(dto.emailVerified).toBe(true);
      expect(dto.hasPendingEmailChange).toBe(false);
      expect(dto.hasPendingPasswordReset).toBe(false);
    });

    it('reports the email as unverified only while its token is present', () => {
      const user = new UserMock();
      user.emailVerificationToken = 'verification-token';
      expect(AdminUserDTO.of(user).emailVerified).toBe(false);

      user.emailVerificationToken = undefined;
      expect(AdminUserDTO.of(user).emailVerified).toBe(true);
    });

    it('reports a pending email change and exposes no token nor new email', () => {
      const user = new UserMock();
      user.pendingEmailToken = 'pending-email-token';
      user.pendingEmail = 'new-email@example.com';

      const dto = AdminUserDTO.of(user);

      expect(dto.hasPendingEmailChange).toBe(true);
      expect(dto).not.toHaveProperty('pendingEmailToken');
      expect(dto).not.toHaveProperty('pendingEmail');
    });

    it('reports a pending password reset and exposes no token', () => {
      const user = new UserMock();
      user.resetPasswordToken = 'reset-token';

      const dto = AdminUserDTO.of(user);

      expect(dto.hasPendingPasswordReset).toBe(true);
      expect(dto).not.toHaveProperty('resetPasswordToken');
    });

    it('keeps the pending flags false while the email is unverified', () => {
      const user = new UserMock();
      user.emailVerificationToken = 'verification-token';

      const dto = AdminUserDTO.of(user);

      expect(dto.emailVerified).toBe(false);
      expect(dto.hasPendingEmailChange).toBe(false);
      expect(dto.hasPendingPasswordReset).toBe(false);
    });
  });
});

describe(AdminUserDetailDTO.name, () => {
  it('exposes the effective permissions resolved by the service (issue #536)', () => {
    const user = new UserMock();
    user.role = UserRole.ADMIN;

    const dto = AdminUserDetailDTO.ofDetail(user, ['user:read', 'user:update']);

    expect(dto.permissions).toEqual(['user:read', 'user:update']);
    expect(dto).toBeInstanceOf(AdminUserDTO);
  });

  it('exposes the resolved avatarUrl alongside the effective permissions (issue #548)', () => {
    const user = new UserMock();
    const resolved = '/uploads/avatars/507f1f77bcf86cd799439011-1700000000000.png';

    const dto = AdminUserDetailDTO.ofDetail(user, ['user:read'], resolved);

    expect(dto.avatarUrl).toBe(resolved);
    expect(dto.permissions).toEqual(['user:read']);
  });

  it('keeps every admin field of the base DTO intact', () => {
    const user = new UserMock();
    user.id = 'user-9';
    user.failedLoginAttempts = 1;

    const dto = AdminUserDetailDTO.ofDetail(user, []);

    expect(dto.id).toBe('user-9');
    expect(dto.failedLoginAttempts).toBe(1);
    expect(dto.lockedUntil).toBeNull();
    expect(dto.permissions).toEqual([]);
  });
});
