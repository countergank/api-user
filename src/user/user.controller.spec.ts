import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MockFunctionMetadata, ModuleMocker } from 'jest-mock';
import { CreateUserResponseDTO } from './dto/create-user-response.dto';
import { UserDTO } from './dto/user.dto';
import { User } from './entities/user.entity';
import { UserEmailAlreadyExistsError } from './errors/user-email-already-exists.error';
import { UserNameAlreadyExistsError } from './errors/user-name-already-exists.error';
import { UserNotFoundError } from './errors/user-not-found.error';
import { CreateUserDTOMock } from './mocks/create-user-dto.mock';
import { UserMock } from './mocks/user.mock';
import { UserController } from './user.controller';
import { UserService } from './user.service';

const moduleMocker = new ModuleMocker(global);

describe(UserController.name, () => {
  let controller: UserController;
  let userService: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [UserService],
    })
      .useMocker((token) => {
        if (typeof token === 'function') {
          const mockMetadata = moduleMocker.getMetadata(token) as MockFunctionMetadata<any, any>;
          const Mock = moduleMocker.generateFromMetadata(mockMetadata);
          return new Mock();
        }
      })
      .compile();

    controller = module.get<UserController>(UserController);
    userService = module.get<UserService>(UserService);
  });

  it(`${UserController.name} should be defined`, () => {
    expect(controller).toBeDefined();
  });

  describe(`${UserController.name}.${UserController.prototype.create.name}`, () => {
    const user = new UserMock();
    const createUserDTO = new CreateUserDTOMock();
    it(`should be create a ${User.name}`, async () => {
      jest.spyOn(userService, 'create').mockResolvedValue(user);
      await expect(controller.create(createUserDTO)).resolves.toBeInstanceOf(CreateUserResponseDTO);
    });
    it(`should return a ${UserEmailAlreadyExistsError.name}`, async () => {
      jest.spyOn(userService, 'create').mockRejectedValueOnce(new UserEmailAlreadyExistsError());
      await expect(controller.create(createUserDTO)).rejects.toThrow(BadRequestException);
    });
    it(`should return a ${UserNameAlreadyExistsError.name}`, async () => {
      jest.spyOn(userService, 'create').mockRejectedValueOnce(new UserNameAlreadyExistsError());
      await expect(controller.create(createUserDTO)).rejects.toThrow(BadRequestException);
    });
    it(`should return a ${InternalServerErrorException.name}`, async () => {
      jest.spyOn(userService, 'create').mockRejectedValueOnce(new Error('Error from test'));
      await expect(controller.create(createUserDTO)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe(`${UserController.name}.${UserController.prototype.findById.name}`, () => {
    const user = new UserMock();
    it(`should be return a ${User.name}`, async () => {
      jest.spyOn(userService, 'findById').mockResolvedValue(user);
      await expect(controller.findById(user.id)).resolves.toBeInstanceOf(UserDTO);
    });
    it(`should return a ${UserNotFoundError.name}`, async () => {
      const user = new UserMock();
      jest.spyOn(userService, 'findById').mockRejectedValueOnce(new UserNotFoundError());
      await expect(controller.findById(user.id)).rejects.toThrow(BadRequestException);
    });

    it(`should return a ${InternalServerErrorException.name}`, async () => {
      jest.spyOn(userService, 'findById').mockRejectedValueOnce(new Error('Error from test'));
      await expect(controller.findById(user.id)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe(`${UserController.name}.${UserController.prototype.findAll.name}`, () => {
    it(`should be return a ${User.name}`, async () => {
      jest.spyOn(userService, 'findAll').mockResolvedValue([new UserMock()]);
      await expect(controller.findAll()).resolves.toBeInstanceOf(Array<UserDTO>);
    });
    it(`should return a ${InternalServerErrorException.name}`, async () => {
      jest.spyOn(userService, 'findAll').mockRejectedValueOnce(new Error('Error from test'));
      await expect(controller.findAll()).rejects.toThrow(InternalServerErrorException);
    });
  });
});
