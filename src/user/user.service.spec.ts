import { Test, TestingModule } from '@nestjs/testing';
import { MockFunctionMetadata, ModuleMocker } from 'jest-mock';
import { User } from './entities/user.entity';
import { UserEmailAlreadyExistsError } from './errors/user-email-already-exists.error';
import { UserNameAlreadyExistsError } from './errors/user-name-already-exists.error';
import { UserNotFoundError } from './errors/user-not-found.error';
import { CreateUserDTOMock } from './mocks/create-user-dto.mock';
import { UserMock } from './mocks/user.mock';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';

const moduleMocker = new ModuleMocker(global);

describe(UserService.name, () => {
  let service: UserService;
  const userRepository = {
    existsByUsername: jest.fn(),
    existsByEmail: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService],
    })
      .useMocker((token) => {
        if (token === UserRepository) {
          return userRepository;
        }
        if (typeof token === 'function') {
          const mockMetadata = moduleMocker.getMetadata(token) as MockFunctionMetadata<any, any>;
          const Mock = moduleMocker.generateFromMetadata(mockMetadata);
          return new Mock();
        }
      })
      .compile();

    service = module.get<UserService>(UserService);
  });

  it(`${UserService.name} should be defined`, () => {
    expect(service).toBeDefined();
  });

  describe(`${UserService.name}.${UserService.prototype.create.name}`, () => {
    const createDto = new CreateUserDTOMock();
    const user = new UserMock();
    it(`should be create a ${User.name}`, async () => {
      jest.spyOn(userRepository, 'existsByUsername').mockResolvedValue(false);
      jest.spyOn(userRepository, 'existsByEmail').mockResolvedValue(false);
      jest.spyOn(userRepository, 'create').mockResolvedValue(user);
      await expect(service.create(createDto)).resolves.toBeInstanceOf(User);
    });
    it(`should return a ${UserEmailAlreadyExistsError.name}`, async () => {
      jest.spyOn(userRepository, 'existsByEmail').mockResolvedValue(true);
      jest.spyOn(userRepository, 'existsByUsername').mockResolvedValue(false);
      await expect(service.create(createDto)).rejects.toThrow(UserEmailAlreadyExistsError);
    });
    it(`should return a ${UserNameAlreadyExistsError.name}`, async () => {
      jest.spyOn(userRepository, 'existsByEmail').mockResolvedValue(false);
      jest.spyOn(userRepository, 'existsByUsername').mockResolvedValue(true);
      await expect(service.create(createDto)).rejects.toThrow(UserNameAlreadyExistsError);
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
    it(`should return a ${UserNotFoundError.name}`, async () => {
      jest.spyOn(userRepository, 'findById').mockResolvedValue(undefined);
      await expect(service.findById(user.id)).rejects.toThrow(UserNotFoundError);
    });
  });
});
