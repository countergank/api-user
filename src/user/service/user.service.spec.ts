import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import { Mock } from '../../../test/helpers';
import { User } from '../entities/user.entity';
import { DomainError } from '../../common/errors/domain.error';
import { CreateUserDTOMock } from '../mocks/create-user-dto.mock';
import { UpdateUserDTOMock } from '../mocks/update-user-dto.mock';
import { UserMock } from '../mocks/user.mock';
import { UserRepository } from '../repository/user.repository';
import { UserService } from './user.service';
import { PaginationQueryDTO } from '../dto/pagination-query.dto';
import { PaginatedUserResponseDTO } from '../dto/paginated-user-response.dto';
import { CacheService } from '../../config/cache';

describe(UserService.name, () => {
  let service: UserService;

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  };

  const userRepository = {
    existsByName: jest.fn(),
    existsByEmail: jest.fn(),
    existsByEmailExcludingSelf: jest.fn(),
    existsByNameExcludingSelf: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    findPaginated: jest.fn(),
  };

  const mockConnection = {
    startSession: jest.fn().mockResolvedValue({
      withTransaction: jest.fn((cb) => cb()),
      endSession: jest.fn(),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService, UserRepository],
    })
      .overrideProvider(UserRepository)
      .useValue(userRepository)
      .useMocker((token) => {
        if (token === getConnectionToken()) return mockConnection;
        if (token === CacheService) return mockCacheService;
        if (typeof token === 'function') return Mock(token);
      })
      .compile();

    service = module.get<UserService>(UserService);
  });

  it(`${UserService.name} should be defined`, () => {
    expect(service).toBeDefined();
  });

  describe(`${UserService.name}.${UserService.prototype.create.name}`, () => {
    const createDto = new CreateUserDTOMock();
    const user = Object.assign(new UserMock(), { _id: { toString: () => '507f1f77bcf86cd799439011' } });
    it(`should be create a ${User.name}`, async () => {
      jest.spyOn(userRepository, 'existsByName').mockResolvedValue(false);
      jest.spyOn(userRepository, 'existsByEmail').mockResolvedValue(false);
      jest.spyOn(userRepository, 'create').mockResolvedValue(user);
      await expect(service.create(createDto)).resolves.toBeInstanceOf(User);
    });
    it(`should throw DomainError when email already exists`, async () => {
      jest.spyOn(userRepository, 'existsByName').mockResolvedValue(false);
      jest.spyOn(userRepository, 'existsByEmail').mockResolvedValue(true);
      await expect(service.create(createDto)).rejects.toBeInstanceOf(DomainError);
      await expect(service.create(createDto)).rejects.toMatchObject({
        kind: expect.objectContaining({ kind: 'ENTITY_EMAIL_ALREADY_EXISTS' }),
      });
    });
    it(`should throw DomainError when username already exists`, async () => {
      jest.spyOn(userRepository, 'existsByName').mockResolvedValue(true);
      jest.spyOn(userRepository, 'existsByEmail').mockResolvedValue(false);
      await expect(service.create(createDto)).rejects.toBeInstanceOf(DomainError);
      await expect(service.create(createDto)).rejects.toMatchObject({
        kind: expect.objectContaining({ kind: 'ENTITY_NAME_ALREADY_EXISTS' }),
      });
    });
  });

  describe(`${UserService.name}.${UserService.prototype.findAll.name}`, () => {
    const user = new UserMock();
    it(`should be return a array of ${User.name}`, async () => {
      jest.spyOn(userRepository, 'findAll').mockResolvedValue([user]);
      await expect(service.findAll()).resolves.toBeInstanceOf(Array<User>);
    });
  });

  describe(`${UserService.name}.${UserService.prototype.findById.name}`, () => {
    const user = new UserMock();
    it(`should be return a ${User.name} by Id`, async () => {
      jest.spyOn(userRepository, 'findById').mockResolvedValue(user);
      await expect(service.findById(user.id)).resolves.toBeInstanceOf(User);
    });
    it(`should throw DomainError when user not found`, async () => {
      jest.spyOn(userRepository, 'findById').mockResolvedValue(undefined);
      await expect(service.findById(user.id)).rejects.toBeInstanceOf(DomainError);
      await expect(service.findById(user.id)).rejects.toMatchObject({
        kind: expect.objectContaining({ kind: 'USER_NOT_FOUND' }),
      });
    });
  });

  describe(`${UserService.name}.${UserService.prototype.updateUser.name}`, () => {
    const user = new UserMock();
    const updateDto = new UpdateUserDTOMock();

    it(`should update a ${User.name} with partial payload`, async () => {
      jest.spyOn(userRepository, 'findById').mockResolvedValue(user);
      jest.spyOn(userRepository, 'update').mockResolvedValue(user);
      await expect(service.updateUser(user.id, updateDto)).resolves.toBeInstanceOf(User);
    });

    it(`should throw DomainError when user not found`, async () => {
      jest.spyOn(userRepository, 'findById').mockResolvedValue(null);
      await expect(service.updateUser('nonexistent-id', updateDto)).rejects.toBeInstanceOf(DomainError);
      await expect(service.updateUser('nonexistent-id', updateDto)).rejects.toMatchObject({
        kind: expect.objectContaining({ kind: 'USER_NOT_FOUND' }),
      });
    });

    it(`should throw DomainError when email conflicts with another user`, async () => {
      jest.spyOn(userRepository, 'findById').mockResolvedValue(user);
      jest.spyOn(userRepository, 'existsByEmailExcludingSelf').mockResolvedValue(true);
      await expect(service.updateUser(user.id, { email: 'other@example.com' })).rejects.toBeInstanceOf(DomainError);
      await expect(service.updateUser(user.id, { email: 'other@example.com' })).rejects.toMatchObject({
        kind: expect.objectContaining({ kind: 'ENTITY_EMAIL_ALREADY_EXISTS' }),
      });
    });

    it(`should throw DomainError when userName conflicts with another user`, async () => {
      jest.spyOn(userRepository, 'findById').mockResolvedValue(user);
      jest.spyOn(userRepository, 'existsByNameExcludingSelf').mockResolvedValue(true);
      await expect(service.updateUser(user.id, { userName: 'otheruser' })).rejects.toBeInstanceOf(DomainError);
      await expect(service.updateUser(user.id, { userName: 'otheruser' })).rejects.toMatchObject({
        kind: expect.objectContaining({ kind: 'ENTITY_NAME_ALREADY_EXISTS' }),
      });
    });

    it(`should allow updating email to same value (self-exclusion)`, async () => {
      jest.spyOn(userRepository, 'findById').mockResolvedValue(user);
      jest.spyOn(userRepository, 'existsByEmailExcludingSelf').mockResolvedValue(false);
      jest.spyOn(userRepository, 'update').mockResolvedValue(user);
      await expect(service.updateUser(user.id, { email: user.email })).resolves.toBeInstanceOf(User);
    });

    it(`should allow updating userName to same value (self-exclusion)`, async () => {
      jest.spyOn(userRepository, 'findById').mockResolvedValue(user);
      jest.spyOn(userRepository, 'existsByNameExcludingSelf').mockResolvedValue(false);
      jest.spyOn(userRepository, 'update').mockResolvedValue(user);
      await expect(service.updateUser(user.id, { userName: user.userName })).resolves.toBeInstanceOf(User);
    });
  });

  describe(`${UserService.name}.${UserService.prototype.deleteUser.name}`, () => {
    const user = new UserMock();

    it(`should soft-delete an active user`, async () => {
      jest.spyOn(userRepository, 'findById').mockResolvedValue(user);
      jest.spyOn(userRepository, 'softDelete').mockResolvedValue({ ...user, isActive: false, deletedAt: new Date() });
      const result = await service.deleteUser(user.id);
      expect(result).toEqual({ userId: user.id });
      expect(userRepository.softDelete).toHaveBeenCalledWith(user.id);
    });

    it(`should return idempotent success on already-deleted user`, async () => {
      jest.clearAllMocks();
      const deletedUser = { ...user, deletedAt: new Date(), isActive: false };
      jest.spyOn(userRepository, 'findById').mockResolvedValue(deletedUser);
      const result = await service.deleteUser(user.id);
      expect(result).toEqual({ userId: user.id });
      expect(userRepository.softDelete).not.toHaveBeenCalled();
    });

    it(`should throw DomainError when user not found`, async () => {
      jest.spyOn(userRepository, 'findById').mockResolvedValue(null);
      await expect(service.deleteUser('nonexistent-id')).rejects.toBeInstanceOf(DomainError);
    });
  });

  describe(`${UserService.name}.${UserService.prototype.toggleActiveUser.name}`, () => {
    const user = new UserMock();

    it(`should deactivate an active user`, async () => {
      const activeUser = { ...user, isActive: true };
      jest.spyOn(userRepository, 'findById').mockResolvedValue(activeUser);
      jest.spyOn(userRepository, 'update').mockResolvedValue({ ...activeUser, isActive: false });
      const result = await service.toggleActiveUser(user.id);
      expect(userRepository.update).toHaveBeenCalledWith(user.id, { isActive: false });
      expect(result.isActive).toBe(false);
    });

    it(`should activate an inactive user`, async () => {
      const inactiveUser = { ...user, isActive: false };
      jest.spyOn(userRepository, 'findById').mockResolvedValue(inactiveUser);
      jest.spyOn(userRepository, 'update').mockResolvedValue({ ...inactiveUser, isActive: true });
      const result = await service.toggleActiveUser(user.id);
      expect(userRepository.update).toHaveBeenCalledWith(user.id, { isActive: true });
      expect(result.isActive).toBe(true);
    });

    it(`should throw DomainError when user is soft-deleted`, async () => {
      const deletedUser = { ...user, deletedAt: new Date(), isActive: false };
      jest.spyOn(userRepository, 'findById').mockResolvedValue(deletedUser);
      await expect(service.toggleActiveUser(user.id)).rejects.toBeInstanceOf(DomainError);
    });

    it(`should throw DomainError when user not found`, async () => {
      jest.spyOn(userRepository, 'findById').mockResolvedValue(null);
      await expect(service.toggleActiveUser('nonexistent-id')).rejects.toBeInstanceOf(DomainError);
    });
  });

  describe(`${UserService.name}.${UserService.prototype.findPaginated.name}`, () => {
    it('should delegate to repository and return paginated envelope', async () => {
      const user = new UserMock();
      const filters: PaginationQueryDTO = { page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' };

      jest.spyOn(userRepository, 'findPaginated').mockResolvedValue({ users: [user], total: 1 });

      const result = await service.findPaginated(filters);

      expect(userRepository.findPaginated).toHaveBeenCalledWith(filters);
      expect(result).toBeInstanceOf(PaginatedUserResponseDTO);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it('should calculate totalPages correctly', async () => {
      const filters: PaginationQueryDTO = { page: 2, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' };

      jest.spyOn(userRepository, 'findPaginated').mockResolvedValue({ users: [], total: 50 });

      const result = await service.findPaginated(filters);

      expect(result.totalPages).toBe(5);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });

    it('should handle empty results', async () => {
      const filters: PaginationQueryDTO = { page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' };

      jest.spyOn(userRepository, 'findPaginated').mockResolvedValue({ users: [], total: 0 });

      const result = await service.findPaginated(filters);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });

  describe(`${UserService.name}.${UserService.prototype.requestEmailChange.name}`, () => {
    const user = new UserMock();

    it('should throw DomainError when target email already exists', async () => {
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(user);
      await expect(service.requestEmailChange('some-id', user.email)).rejects.toBeInstanceOf(DomainError);
      await expect(service.requestEmailChange('some-id', user.email)).rejects.toMatchObject({
        kind: expect.objectContaining({ kind: 'EMAIL_ALREADY_EXISTS' }),
      });
    });

    it('should request an email change when target email is free', async () => {
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(null);
      jest.spyOn(userRepository, 'findById').mockResolvedValue(user);
      jest.spyOn(userRepository, 'update').mockResolvedValue(user);

      const result = await service.requestEmailChange(user.id, 'new@example.com');
      expect(result.user).toBe(user);
      expect(result.token).toBeDefined();
    });
  });

  describe('Cache invalidation', () => {
    beforeEach(() => {
      mockCacheService.del.mockResolvedValue(undefined);
    });

    it('should invalidate cache after create', async () => {
      const createDto = new CreateUserDTOMock();
      const user = Object.assign(new UserMock(), { _id: { toString: () => '507f1f77bcf86cd799439011' } });
      jest.spyOn(userRepository, 'existsByName').mockResolvedValue(false);
      jest.spyOn(userRepository, 'existsByEmail').mockResolvedValue(false);
      jest.spyOn(userRepository, 'create').mockResolvedValue(user);

      await service.create(createDto);

      expect(mockCacheService.del).toHaveBeenCalledWith('user:507f1f77bcf86cd799439011');
    });

    it('should invalidate cache after updateUser', async () => {
      const user = new UserMock();
      const updateDto = new UpdateUserDTOMock();
      jest.spyOn(userRepository, 'findById').mockResolvedValue(user);
      jest.spyOn(userRepository, 'update').mockResolvedValue(user);

      await service.updateUser(user.id, updateDto);

      expect(mockCacheService.del).toHaveBeenCalledWith(`user:${user.id}`);
    });

    it('should invalidate cache after deleteUser', async () => {
      const user = new UserMock();
      jest.spyOn(userRepository, 'findById').mockResolvedValue(user);
      jest.spyOn(userRepository, 'softDelete').mockResolvedValue({ ...user, isActive: false, deletedAt: new Date() });

      await service.deleteUser(user.id);

      expect(mockCacheService.del).toHaveBeenCalledWith(`user:${user.id}`);
    });

    it('should invalidate cache after toggleActiveUser', async () => {
      const user = new UserMock();
      const activeUser = { ...user, isActive: true };
      jest.spyOn(userRepository, 'findById').mockResolvedValue(activeUser);
      jest.spyOn(userRepository, 'update').mockResolvedValue({ ...activeUser, isActive: false });

      await service.toggleActiveUser(user.id);

      expect(mockCacheService.del).toHaveBeenCalledWith(`user:${user.id}`);
    });

    it('should invalidate cache after unlockUser', async () => {
      const user = new UserMock();
      jest.spyOn(userRepository, 'findById').mockResolvedValue(user);
      jest.spyOn(userRepository, 'update').mockResolvedValue(user);

      await service.unlockUser(user.id);

      expect(mockCacheService.del).toHaveBeenCalledWith(`user:${user.id}`);
    });
  });
});
