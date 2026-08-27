import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { AuthService } from '../auth.service';

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
});
