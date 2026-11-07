import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { AuthService, JwtPayload } from '../auth.service';
import { User, UserRole } from '../../user/entities/user.entity';

describe(JwtStrategy.name, () => {
  it('should use ConfigService to retrieve JWT_SECRET', () => {
    const testSecret = 'test-jwt-secret-from-config';
    const configService = {
      getOrThrow: jest.fn().mockReturnValue(testSecret),
    } as unknown as ConfigService;

    const authService = {} as AuthService;

    const strategy = new JwtStrategy(authService, configService);

    expect(configService.getOrThrow).toHaveBeenCalledWith('JWT_SECRET');
    expect(strategy).toBeDefined();
  });

  it('should not use hardcoded secret or process.env directly', () => {
    const configService = {
      getOrThrow: jest.fn().mockReturnValue('config-secret'),
    } as unknown as ConfigService;

    const authService = {} as AuthService;

    new JwtStrategy(authService, configService);

    expect(configService.getOrThrow).toHaveBeenCalledWith('JWT_SECRET');
    expect(configService.getOrThrow).toHaveBeenCalledTimes(1);
  });

  describe('validate session version (issue #532 S6)', () => {
    /** A strategy whose AuthService double returns whatever the test sets. */
    const buildStrategy = () => {
      const validateUser = jest.fn<Promise<User | null>, [string]>();
      const authService = { validateUser } as unknown as AuthService;
      const configService = {
        getOrThrow: jest.fn().mockReturnValue('config-secret'),
      } as unknown as ConfigService;
      const strategy = new JwtStrategy(authService, configService);
      return { strategy, validateUser };
    };

    const userWithEpoch = (sessionEpoch?: number) => ({ id: 'user-1', sessionEpoch }) as unknown as User;

    const payloadWith = (tv?: number): JwtPayload => ({
      sub: 'user-1',
      email: 'user@test.com',
      role: UserRole.USER,
      ...(tv !== undefined && { tv }),
    });

    it('returns null (revoked) when the token tv is below the durable sessionEpoch', async () => {
      const { strategy, validateUser } = buildStrategy();
      validateUser.mockResolvedValue(userWithEpoch(2));

      await expect(strategy.validate(payloadWith(1))).resolves.toBeNull();
      expect(validateUser).toHaveBeenCalledWith('user-1');
    });

    it('returns the user when the token tv matches the durable sessionEpoch', async () => {
      const { strategy, validateUser } = buildStrategy();
      const user = userWithEpoch(2);
      validateUser.mockResolvedValue(user);

      await expect(strategy.validate(payloadWith(2))).resolves.toBe(user);
    });

    it('keeps accepting a token without tv while sessionEpoch is 0', async () => {
      const { strategy, validateUser } = buildStrategy();
      const user = userWithEpoch(0);
      validateUser.mockResolvedValue(user);

      await expect(strategy.validate(payloadWith(undefined))).resolves.toBe(user);
    });

    it('rejects a token without tv once sessionEpoch reaches 1', async () => {
      const { strategy, validateUser } = buildStrategy();
      validateUser.mockResolvedValue(userWithEpoch(1));

      await expect(strategy.validate(payloadWith(undefined))).resolves.toBeNull();
    });
  });
});
