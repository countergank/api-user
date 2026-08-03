import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken } from '@nestjs/mongoose';
import { Mock } from '../../../test/helpers';
import { CreateUserResponseDTO } from '../dto/create-user-response.dto';
import { UserDTO } from '../dto/user.dto';
import { UpdateUserDTO } from '../dto/update-user.dto';
import { PaginationQueryDTO } from '../dto/pagination-query.dto';
import { PaginatedUserResponseDTO } from '../dto/paginated-user-response.dto';
import { User } from '../entities/user.entity';
import { CreateUserDTOMock } from '../mocks/create-user-dto.mock';
import { UpdateUserDTOMock } from '../mocks/update-user-dto.mock';
import { UserMock } from '../mocks/user.mock';
import { UserService } from '../service/user.service';
import { UserController } from './user.controller';

describe(UserController.name, () => {
  let controller: UserController;
  let userService: UserService;

  const mockConnection = {
    startSession: jest.fn().mockResolvedValue({
      withTransaction: jest.fn((cb) => cb()),
      endSession: jest.fn(),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [UserService],
    })
      .useMocker((token) => {
        if (token === getConnectionToken()) return mockConnection;
        if (typeof token === 'function') return Mock(token);
      })
      .compile();

    controller = module.get<UserController>(UserController);
    userService = module.get<UserService>(UserService);

    // Mock i18n translate to echo the key (tests verify structure, not language)
    (controller as any).i18n = { translate: jest.fn().mockImplementation((key: string) => Promise.resolve(key)) };
  });

  it(`${UserController.name} should be defined`, () => {
    expect(controller).toBeDefined();
  });

  describe(`${UserController.name}.${UserController.prototype.create.name}`, () => {
    const user = new UserMock().randomize();
    const createUserDTO = new CreateUserDTOMock().randomize();
    it(`should be create a ${User.name}`, async () => {
      jest.spyOn(userService, 'createWithRole').mockResolvedValue(user);
      await expect(controller.create(createUserDTO)).resolves.toBeInstanceOf(CreateUserResponseDTO);
    });
  });

  describe(`${UserController.name}.${UserController.prototype.findById.name}`, () => {
    const user = new UserMock();
    it(`should be return a ${User.name}`, async () => {
      jest.spyOn(userService, 'findById').mockResolvedValue(user);
      await expect(controller.findById(user.id)).resolves.toBeInstanceOf(UserDTO);
    });
  });

  describe(`${UserController.name}.${UserController.prototype.findAll.name}`, () => {
    it(`should be return a ${User.name}`, async () => {
      jest.spyOn(userService, 'findAll').mockResolvedValue([new UserMock()]);
      await expect(controller.findAll()).resolves.toBeInstanceOf(Array<UserDTO>);
    });

    it('should return paginated envelope when page param is present', async () => {
      const user = new UserMock();
      const paginatedResponse = PaginatedUserResponseDTO.of([UserDTO.of(user)], 1, 1, 20);
      const filters: PaginationQueryDTO = { page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' };

      jest.spyOn(userService, 'findPaginated').mockResolvedValue(paginatedResponse);

      const result = await controller.findAll(filters);

      expect(result).toBeInstanceOf(PaginatedUserResponseDTO);
      expect((result as PaginatedUserResponseDTO<UserDTO>).data).toHaveLength(1);
      expect((result as PaginatedUserResponseDTO<UserDTO>).total).toBe(1);
      expect((result as PaginatedUserResponseDTO<UserDTO>).totalPages).toBe(1);
    });

    it('should return paginated envelope with custom page and limit', async () => {
      const users = Array.from({ length: 10 }, () => UserDTO.of(new UserMock().randomize()));
      const paginatedResponse = PaginatedUserResponseDTO.of(users, 50, 2, 10);
      const filters: PaginationQueryDTO = { page: 2, limit: 10, sortBy: 'name', sortOrder: 'asc' };

      jest.spyOn(userService, 'findPaginated').mockResolvedValue(paginatedResponse);

      const result = await controller.findAll(filters);

      expect(result).toBeInstanceOf(PaginatedUserResponseDTO);
      expect((result as PaginatedUserResponseDTO<UserDTO>).data).toHaveLength(10);
      expect((result as PaginatedUserResponseDTO<UserDTO>).total).toBe(50);
      expect((result as PaginatedUserResponseDTO<UserDTO>).page).toBe(2);
      expect((result as PaginatedUserResponseDTO<UserDTO>).limit).toBe(10);
      expect((result as PaginatedUserResponseDTO<UserDTO>).totalPages).toBe(5);
    });

    it('should pass filters to service findPaginated', async () => {
      const filters: PaginationQueryDTO = {
        page: 1,
        limit: 10,
        sortBy: 'name',
        sortOrder: 'asc',
        role: 'admin',
        isActive: true,
        search: 'juan',
      };
      const paginatedResponse = PaginatedUserResponseDTO.of([], 0, 1, 10);

      jest.spyOn(userService, 'findPaginated').mockResolvedValue(paginatedResponse);

      await controller.findAll(filters);

      expect(userService.findPaginated).toHaveBeenCalledWith(filters);
    });
  });

  describe(`${UserController.name}.${UserController.prototype.unlock.name}`, () => {
    const user = new UserMock();
    it(`should unlock a locked account and return success message`, async () => {
      jest.spyOn(userService, 'unlockUser').mockResolvedValue(user);
      const result = await controller.unlock(user.id, undefined);
      expect(result).toEqual({
        message: 'messages.account_unlocked',
        userId: user.id,
      });
    });
  });

  describe(`${UserController.name}.${UserController.prototype.update.name}`, () => {
    const user = new UserMock();
    const updateDto = new UpdateUserDTOMock();

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it(`should update a ${User.name} and return ${UserDTO.name}`, async () => {
      jest.spyOn(userService, 'updateUser').mockResolvedValue(user);
      await expect(controller.update(user.id, updateDto)).resolves.toBeInstanceOf(UserDTO);
    });
  });

  describe(`${UserController.name}.${UserController.prototype.delete.name}`, () => {
    const user = new UserMock();

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it(`should delete a user and return confirmation`, async () => {
      jest.spyOn(userService, 'deleteUser').mockResolvedValue({ userId: user.id });
      const result = await controller.delete(user.id, undefined);
      expect(result).toEqual({ message: 'messages.user_deleted', userId: user.id });
    });

    it(`should return idempotent success on already-deleted user`, async () => {
      jest.spyOn(userService, 'deleteUser').mockResolvedValue({ userId: user.id });
      const result = await controller.delete(user.id, undefined);
      expect(result).toEqual({ message: 'messages.user_deleted', userId: user.id });
    });
  });

  describe(`${UserController.name}.${UserController.prototype.toggleActive.name}`, () => {
    const user = new UserMock();

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it(`should toggle user active status and return ${UserDTO.name}`, async () => {
      const toggledUser = { ...user, isActive: false };
      jest.spyOn(userService, 'toggleActiveUser').mockResolvedValue(toggledUser);
      await expect(controller.toggleActive(user.id)).resolves.toBeInstanceOf(UserDTO);
    });
  });
});
