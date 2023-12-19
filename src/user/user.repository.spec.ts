import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, Model } from 'mongoose';
import { Mock, clearMongoCollection, clearMongoConnection, createConnection } from '../../test/helpers';
import { EncodeService } from '../encode/encode.service';
import { HashMock } from '../encode/mocks/hash.mock';
import { User, UserSchema } from './entities/user.entity';
import { UserMock } from './mocks/user.mock';
import { UserRepository } from './user.repository';

describe(UserRepository.name, () => {
  let newMongod: MongoMemoryServer;
  let newMongoConnection: Connection;
  let userModel: Model<User>;
  let repository: UserRepository;
  const encodeService = {
    hash: jest.fn(),
  };

  beforeEach(async () => {
    const { mongod, mongoConnection } = await createConnection();
    newMongod = mongod;
    newMongoConnection = mongoConnection;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRepository,
        EncodeService,
        {
          provide: getModelToken(User.name),
          useValue: userModel,
        },
      ],
    })
      .useMocker((token) => {
        if (token === EncodeService) return encodeService;
        if (typeof token === 'function') return Mock(token);
      })
      .compile();

    userModel = newMongoConnection.model(User.name, UserSchema);
    repository = module.get<UserRepository>(UserRepository);
  });

  afterAll(async () => {
    await clearMongoConnection(newMongoConnection, newMongod);
  });

  afterEach(async () => {
    await clearMongoCollection(newMongoConnection);
  });

  it(`${UserRepository.name} should be defined`, () => {
    expect(repository).toBeDefined();
  });

  describe(`${UserRepository.name}.${UserRepository.prototype.create.name}`, () => {
    const user = new UserMock();
    delete user.id;

    it(`should be create a ${User.name}`, async () => {
      jest.spyOn(encodeService, 'hash').mockResolvedValue(new HashMock());
      await expect(repository.create(user)).resolves.toBeInstanceOf(Model<User>);
    });
  });
});
