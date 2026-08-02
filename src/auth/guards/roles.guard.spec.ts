import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../../user/entities/user.entity';
import { DomainError } from '../../common/errors/domain.error';

describe(RolesGuard.name, () => {
  let guard: RolesGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  const createContext = (user?: unknown): ExecutionContext =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should allow access when no roles are required', () => {
      reflector.getAllAndOverride.mockReturnValue(null);

      expect(guard.canActivate(createContext({}))).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [expect.anything(), expect.anything()]);
    });

    it('should throw DomainError FORBIDDEN when user is not authenticated', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

      let thrown: unknown;
      try {
        guard.canActivate(createContext(undefined));
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(DomainError);
      expect((thrown as DomainError).kind.kind).toBe('FORBIDDEN');
      expect((thrown as DomainError).statusCode).toBe(403);
    });

    it('should throw DomainError FORBIDDEN when user has no role assigned', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

      let thrown: unknown;
      try {
        guard.canActivate(createContext({}));
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(DomainError);
      expect((thrown as DomainError).kind.kind).toBe('FORBIDDEN');
    });

    it('should throw DomainError FORBIDDEN when user role is not in required roles', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

      let thrown: unknown;
      try {
        guard.canActivate(createContext({ role: UserRole.USER }));
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(DomainError);
      expect((thrown as DomainError).kind.kind).toBe('FORBIDDEN');
    });

    it('should allow access when user has a required role', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN, UserRole.USER]);

      expect(guard.canActivate(createContext({ role: UserRole.ADMIN }))).toBe(true);
    });
  });
});
