import { ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from './permissions.guard';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { DomainError } from '../../common/errors/domain.error';

describe(PermissionGuard.name, () => {
  let guard: PermissionGuard;
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
    guard = new PermissionGuard(reflector as unknown as Reflector);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should allow access when no permissions are required', () => {
      reflector.getAllAndOverride.mockReturnValue(null);

      expect(guard.canActivate(createContext({}))).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(PERMISSIONS_KEY, [expect.anything(), expect.anything()]);
    });

    it('should throw DomainError INVALID_TOKEN when user is not authenticated', () => {
      reflector.getAllAndOverride.mockReturnValue(['user:read']);

      let thrown: unknown;
      try {
        guard.canActivate(createContext(undefined));
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(DomainError);
      expect((thrown as DomainError).kind.kind).toBe('INVALID_TOKEN');
      expect((thrown as DomainError).statusCode).toBe(401);
    });

    it('should throw DomainError FORBIDDEN when user lacks required permissions', () => {
      reflector.getAllAndOverride.mockReturnValue(['user:read', 'user:write']);

      let thrown: unknown;
      try {
        guard.canActivate(createContext({ permissions: ['user:read'] }));
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(DomainError);
      expect((thrown as DomainError).kind.kind).toBe('FORBIDDEN');
    });

    it('should allow access when user has all required permissions', () => {
      reflector.getAllAndOverride.mockReturnValue(['user:read', 'user:write']);

      expect(guard.canActivate(createContext({ permissions: ['user:read', 'user:write'] }))).toBe(true);
    });

    it('should allow access when user has wildcard permission', () => {
      reflector.getAllAndOverride.mockReturnValue(['user:read', 'timer:start']);

      expect(guard.canActivate(createContext({ permissions: ['*'] }))).toBe(true);
    });

    it('should allow access when user has resource wildcard permission', () => {
      reflector.getAllAndOverride.mockReturnValue(['timer:start']);

      expect(guard.canActivate(createContext({ permissions: ['timer:*'] }))).toBe(true);
    });

    it('should allow access when the metadata declares an empty permission list', () => {
      reflector.getAllAndOverride.mockReturnValue([]);

      expect(guard.canActivate(createContext({ permissions: [] }))).toBe(true);
    });

    it('should throw DomainError FORBIDDEN when the resource wildcard targets a different resource', () => {
      reflector.getAllAndOverride.mockReturnValue(['timer:start']);

      let thrown: unknown;
      try {
        guard.canActivate(createContext({ permissions: ['user:*'] }));
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(DomainError);
      expect((thrown as DomainError).kind.kind).toBe('FORBIDDEN');
    });

    it('should fail closed with FORBIDDEN and log the original error when reading permission metadata throws', () => {
      const metadataError = new Error('reflector exploded');
      reflector.getAllAndOverride.mockImplementation(() => {
        throw metadataError;
      });
      const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

      let thrown: unknown;
      try {
        guard.canActivate(createContext({ permissions: ['*'] }));
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(DomainError);
      expect((thrown as DomainError).kind.kind).toBe('FORBIDDEN');
      expect((thrown as DomainError).statusCode).toBe(403);
      expect(thrown).not.toBe(metadataError);
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('reflector exploded'), metadataError.stack);
    });
  });
});
