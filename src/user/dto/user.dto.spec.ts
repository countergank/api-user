import { UserDTO } from './user.dto';
import { UserMock } from '../mocks/user.mock';
import { UserRole } from '../entities/user.entity';

describe(UserDTO.name, () => {
  describe('account lock state (COU-261)', () => {
    it('exposes lockedUntil and failedLoginAttempts of a locked account', () => {
      const lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      const user = new UserMock();
      user.id = 'user-1';
      user.failedLoginAttempts = 5;
      user.lockedUntil = lockedUntil;

      const dto = UserDTO.of(user);

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

      const dto = UserDTO.of(user);

      expect(dto.lockedUntil).toBeNull();
      expect(dto.failedLoginAttempts).toBe(0);
    });

    it('keeps the previously exposed fields unchanged', () => {
      const user = new UserMock();
      user.id = 'user-2';
      user.role = UserRole.ADMIN;
      user.failedLoginAttempts = 2;

      const dto = UserDTO.of(user);

      expect(dto.id).toBe('user-2');
      expect(dto.name).toBe(user.name);
      expect(dto.lastName).toBe(user.lastName);
      expect(dto.email).toBe(user.email);
      expect(dto.userName).toBe(user.userName);
      expect(dto.role).toBe(UserRole.ADMIN);
      expect(dto.isActive).toBe(true);
    });
  });
});
