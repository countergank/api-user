import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

describe('AuthModule JWT configuration', () => {
  it('should configure JwtModule asynchronously with ConfigService', async () => {
    const testSecret = 'test-secret-for-jwt-signing';
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({ JWT_SECRET: testSecret })],
        }),
        JwtModule.registerAsync({
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            secret: config.getOrThrow('JWT_SECRET'),
            signOptions: { expiresIn: '15m' },
          }),
        }),
      ],
    }).compile();

    const jwtService = module.get<JwtService>(JwtService);
    expect(jwtService).toBeDefined();

    const token = jwtService.sign({ sub: 'test-user', email: 'test@test.com' });
    const decoded = jwtService.verify(token);
    expect(decoded.sub).toBe('test-user');
  });
});
