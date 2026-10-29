import { UserDTO } from './user.dto';
import { UserMock } from '../mocks/user.mock';

describe(UserDTO.name, () => {
  describe('base DTO boundary (COU-346)', () => {
    it('does not expose the admin lock-state fields (S1, S2)', () => {
      const user = new UserMock();
      const userDto = UserDTO.of(user);

      // Estos campos no deben existir en el DTO base: solo AdminUserDTO los expone.
      // @ts-expect-error lockedUntil must not exist on UserDTO
      userDto.lockedUntil;
      // @ts-expect-error failedLoginAttempts must not exist on UserDTO
      userDto.failedLoginAttempts;
    });
  });
});
