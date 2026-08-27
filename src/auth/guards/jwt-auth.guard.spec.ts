import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ClsService } from 'nestjs-cls';
import { DomainError } from '../../common/errors/domain.error';

describe(JwtAuthGuard.name, () => {
  let guard: JwtAuthGuard;
  let clsService: ClsService;

  const mockClsService = {
    set: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: ClsService,
          useValue: mockClsService,
        },
      ],
    }).compile();

    guard = module.get(JwtAuthGuard);
    clsService = module.get(ClsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('handleRequest', () => {
    it('should set userId in CLS when user is authenticated', () => {
      const user = { _id: 'user-123', email: 'test@test.com' };
      const request = { ip: '127.0.0.1' };
      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      } as unknown as ExecutionContext;

      guard.handleRequest(null, user, null, context);

      expect(clsService.set).toHaveBeenCalledWith('userId', 'user-123');
    });

    it('should set userId using user.id if _id is not available', () => {
      const user = { id: 'user-456', email: 'test@test.com' };
      const request = { ip: '127.0.0.1' };
      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      } as unknown as ExecutionContext;

      guard.handleRequest(null, user, null, context);

      expect(clsService.set).toHaveBeenCalledWith('userId', 'user-456');
    });

    it('should throw DomainError INVALID_TOKEN when user is null', () => {
      const request = { ip: '127.0.0.1' };
      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      } as unknown as ExecutionContext;

      let thrown: unknown;
      try {
        guard.handleRequest(null, null, null, context);
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(DomainError);
      expect((thrown as DomainError).kind.kind).toBe('INVALID_TOKEN');
      expect((thrown as DomainError).statusCode).toBe(401);
    });

    it('should throw error when err is provided', () => {
      const error = new Error('Test error');
      const request = { ip: '127.0.0.1' };
      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      } as unknown as ExecutionContext;

      expect(() => guard.handleRequest(error, null, null, context)).toThrow(error);
    });
  });
});
