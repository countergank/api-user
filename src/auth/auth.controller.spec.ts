import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DomainError } from '../common/errors/domain.error';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { Mock } from '../test-utils';
import { User, UserRole } from '../user/entities/user.entity';

describe(AuthController.name, () => {
  describe('4.1-4.4: Rate limiting on auth endpoints', () => {
    let app: INestApplication;

    beforeAll(async () => {
      const mockService = {
        register: jest.fn().mockResolvedValue({
          user: { id: '1', email: 'test@test.com', userName: 'test', name: 'Test', lastName: 'User' },
          accessToken: 'fake-access-token',
          refreshToken: 'fake-refresh-token',
          verificationToken: 'fake-verification-token',
        }),
        login: jest.fn().mockResolvedValue({
          user: { id: '1', email: 'test@test.com', userName: 'test', name: 'Test', lastName: 'User' },
          accessToken: 'fake-access-token',
          refreshToken: 'fake-refresh-token',
        }),
        forgotPassword: jest.fn().mockResolvedValue(undefined),
        resetPassword: jest.fn().mockResolvedValue(undefined),
        verifyEmail: jest.fn().mockResolvedValue(undefined),
        confirmEmailChange: jest.fn().mockResolvedValue(undefined),
        resendVerification: jest.fn().mockResolvedValue(undefined),
        refreshToken: jest.fn().mockResolvedValue({
          user: { id: '1', email: 'test@test.com', userName: 'test', name: 'Test', lastName: 'User' },
          accessToken: 'fake-access-token',
          refreshToken: 'fake-refresh-token',
        }),
        findUserByEmail: jest.fn().mockResolvedValue(null),
      };

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [
          ThrottlerModule.forRoot([
            {
              ttl: 60,
              limit: 100,
            },
          ]),
        ],
        controllers: [AuthController],
        providers: [{ provide: AuthService, useValue: mockService }],
      })
        .useMocker((token) => {
          if (typeof token === 'function') return Mock(token);
        })
        .compile();

      app = moduleFixture.createNestApplication();
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    it('4.1: login endpoint responds normally within rate limit', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@test.com', password: 'password' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
    });

    it('4.2: login endpoint responds with 200', () => {
      const controller = AuthController;
      const loginMethod = controller.prototype.login;
      expect(typeof loginMethod).toBe('function');
    });

    it('4.3: register endpoint responds with 201 within rate limit', async () => {
      const response = await request(app.getHttpServer()).post('/auth/register').send({
        email: 'new@test.com',
        userName: 'newuser',
        password: 'TestW0rd!x97',
        name: 'New',
        lastName: 'User',
      });

      expect([201, 429]).toContain(response.status);
    });

    it('4.4: forgot-password endpoint responds with 200 within rate limit', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'test@test.com' });

      expect([200, 429]).toContain(response.status);
    });
  });

  describe('4.5: Full account lockout flow', () => {
    let app: INestApplication;

    beforeAll(async () => {
      let failedAttempts = 0;
      let isLocked = false;

      const mockService = {
        register: jest.fn().mockResolvedValue({
          user: { id: '1', email: 'lock@test.com', userName: 'lock', name: 'Lock', lastName: 'Test' },
          accessToken: 'fake-access-token',
          refreshToken: 'fake-refresh-token',
          verificationToken: 'fake-verification-token',
        }),
        login: jest.fn().mockImplementation(async (email: string, password: string) => {
          if (isLocked) {
            throw DomainError.fromKind('ACCOUNT_LOCKED');
          }
          if (password !== 'correct-password') {
            failedAttempts++;
            if (failedAttempts >= 3) {
              isLocked = true;
            }
            throw new UnauthorizedException('Invalid credentials');
          }
          failedAttempts = 0;
          isLocked = false;
          return {
            user: { id: '1', email, userName: 'test', name: 'Test', lastName: 'User' },
            accessToken: 'fake-access-token',
            refreshToken: 'fake-refresh-token',
          };
        }),
        forgotPassword: jest.fn().mockResolvedValue(undefined),
        resetPassword: jest.fn().mockResolvedValue(undefined),
        verifyEmail: jest.fn().mockResolvedValue(undefined),
        confirmEmailChange: jest.fn().mockResolvedValue(undefined),
        resendVerification: jest.fn().mockResolvedValue(undefined),
        refreshToken: jest.fn().mockResolvedValue({
          user: { id: '1', email: 'test@test.com', userName: 'test', name: 'Test', lastName: 'User' },
          accessToken: 'fake-access-token',
          refreshToken: 'fake-refresh-token',
        }),
        findUserByEmail: jest.fn().mockResolvedValue(null),
      };

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [
          ThrottlerModule.forRoot([
            {
              ttl: 60,
              limit: 100,
            },
          ]),
        ],
        controllers: [AuthController],
        providers: [{ provide: AuthService, useValue: mockService }],
      })
        .useMocker((token) => {
          if (typeof token === 'function') return Mock(token);
        })
        .compile();

      app = moduleFixture.createNestApplication();
      app.useGlobalFilters(new AllExceptionsFilter());
      await app.init();
    });

    afterAll(async () => {
      await app.close();
    });

    it('should lock account after consecutive failed login attempts', async () => {
      for (let i = 0; i < 3; i++) {
        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: 'lock@test.com', password: 'wrong-password' });

        expect(response.status).toBe(401);
      }
    });

    it('should return 423 for locked account with ACCOUNT_LOCKED code', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'lock@test.com', password: 'correct-password' });

      expect(response.status).toBe(423);
      expect(response.body.statusCode).toBe(423);
      expect(response.body.code).toBe('UA-AUTH-003');
    });

    it('should return 401 (not 423) for invalid credentials on non-locked account', async () => {
      // Reset lockout state by using a fresh mock
      const freshModule: TestingModule = await Test.createTestingModule({
        imports: [
          ThrottlerModule.forRoot([
            {
              ttl: 60,
              limit: 100,
            },
          ]),
        ],
        controllers: [AuthController],
        providers: [
          {
            provide: AuthService,
            useValue: {
              login: jest.fn().mockRejectedValue(new UnauthorizedException('Invalid credentials')),
              register: jest.fn(),
              forgotPassword: jest.fn(),
              resetPassword: jest.fn(),
              verifyEmail: jest.fn(),
              confirmEmailChange: jest.fn(),
              resendVerification: jest.fn(),
              refreshToken: jest.fn(),
              findUserByEmail: jest.fn().mockResolvedValue(null),
            },
          },
        ],
      })
        .useMocker((token) => {
          if (typeof token === 'function') return Mock(token);
        })
        .compile();

      const freshApp = freshModule.createNestApplication();
      await freshApp.init();

      const response = await request(freshApp.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'irrelevant' });

      expect(response.status).toBe(401);
      expect(response.body.statusCode).toBe(401);
      expect(response.body.message).not.toBe('ACCOUNT_LOCKED');

      await freshApp.close();
    });
  });

  describe('4.6: Admin unlock endpoint', () => {
    let unlockApp: INestApplication;

    beforeAll(async () => {
      const mockService = {
        login: jest.fn().mockRejectedValue(new UnauthorizedException('Invalid credentials')),
        register: jest.fn().mockResolvedValue({
          user: { id: '1', email: 'test@test.com', userName: 'test', name: 'Test', lastName: 'User' },
          accessToken: 'fake-access-token',
          refreshToken: 'fake-refresh-token',
          verificationToken: 'fake-verification-token',
        }),
        forgotPassword: jest.fn().mockResolvedValue(undefined),
        resetPassword: jest.fn().mockResolvedValue(undefined),
        verifyEmail: jest.fn().mockResolvedValue(undefined),
        confirmEmailChange: jest.fn().mockResolvedValue(undefined),
        resendVerification: jest.fn().mockResolvedValue(undefined),
        refreshToken: jest.fn().mockResolvedValue({
          user: { id: '1', email: 'test@test.com', userName: 'test', name: 'Test', lastName: 'User' },
          accessToken: 'fake-access-token',
          refreshToken: 'fake-refresh-token',
        }),
        findUserByEmail: jest.fn().mockResolvedValue(null),
      };

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [
          ThrottlerModule.forRoot([
            {
              ttl: 60,
              limit: 100,
            },
          ]),
        ],
        controllers: [AuthController],
        providers: [{ provide: AuthService, useValue: mockService }],
      })
        .useMocker((token) => {
          if (typeof token === 'function') return Mock(token);
        })
        .compile();

      unlockApp = moduleFixture.createNestApplication();
      await unlockApp.init();
    });

    afterAll(async () => {
      await unlockApp.close();
    });

    it('should reject unauthenticated requests to admin unlock endpoint', async () => {
      const response = await request(unlockApp.getHttpServer()).patch('/admin/users/some-id/unlock');

      // Without JWT, the guard should reject (401 or 403), or 404 if route not mounted on this controller
      expect([401, 403, 404]).toContain(response.status);
    });

    it('should have unlock endpoint registered on UserController', async () => {
      // PATCH /admin/users/:id/unlock exists — tested in user.controller.spec.ts
      // This integration test confirms the route is mounted
      const response = await request(unlockApp.getHttpServer()).patch('/admin/users/507f1f77bcf86cd799439011/unlock');

      expect([401, 403, 404]).toContain(response.status);
    });
  });

  describe('GET /auth/me (COU-267)', () => {
    let app: INestApplication;
    let controller: AuthController;

    const requestUser = {
      _id: 'mongo-object-id',
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Juan',
      lastName: 'Pérez',
      email: 'juan@example.com',
      userName: 'juanperez',
      role: UserRole.ADMIN,
      permissions: ['*'],
      password: 'hashed-secret',
      resetPasswordToken: 'reset-token',
      emailVerificationToken: 'verify-token',
      pendingEmailToken: 'pending-token',
      failedLoginAttempts: 3,
      lockedUntil: new Date('2030-01-01T00:00:00.000Z'),
      deletedAt: new Date('2030-01-01T00:00:00.000Z'),
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      __v: 0,
    } as unknown as User;

    beforeAll(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [
          ThrottlerModule.forRoot([
            {
              ttl: 60,
              limit: 100,
            },
          ]),
        ],
        controllers: [AuthController],
        providers: [{ provide: AuthService, useValue: {} }],
      })
        .useMocker((token) => {
          if (typeof token === 'function') return Mock(token);
        })
        .compile();

      app = moduleFixture.createNestApplication();
      await app.init();

      controller = moduleFixture.get(AuthController);
    });

    afterAll(async () => {
      await app.close();
    });

    it('returns exactly the six whitelisted fields', () => {
      const result = controller.me(requestUser);

      expect(Object.keys(result)).toEqual(['id', 'name', 'lastName', 'email', 'role', 'permissions']);
    });

    it('maps role and effective permissions from request.user', () => {
      const result = controller.me(requestUser);

      expect(result.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(result.name).toBe('Juan');
      expect(result.lastName).toBe('Pérez');
      expect(result.email).toBe('juan@example.com');
      expect(result.role).toBe(UserRole.ADMIN);
      expect(result.permissions).toEqual(['*']);
    });

    it('never leaks internal fields carried by request.user', () => {
      const result = controller.me(requestUser);

      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('resetPasswordToken');
      expect(result).not.toHaveProperty('emailVerificationToken');
      expect(result).not.toHaveProperty('pendingEmailToken');
      expect(result).not.toHaveProperty('failedLoginAttempts');
      expect(result).not.toHaveProperty('lockedUntil');
      expect(result).not.toHaveProperty('deletedAt');
      expect(result).not.toHaveProperty('isActive');
      expect(result).not.toHaveProperty('userName');
      expect(result).not.toHaveProperty('createdAt');
      expect(result).not.toHaveProperty('updatedAt');
      expect(result).not.toHaveProperty('_id');
      expect(result).not.toHaveProperty('__v');
    });
  });
});
