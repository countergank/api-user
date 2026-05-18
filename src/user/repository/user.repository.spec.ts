import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, Model } from 'mongoose';
import { clearMongoCollection, clearMongoConnection, createConnection } from '../../../test/helpers';
import { EncodeService } from '../../encode/encode.service';
import { HashMock } from '../../encode/mocks/hash.mock';
import { User, UserSchema } from '../entities/user.entity';
import { UserMock } from '../mocks/user.mock';
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
      .overrideProvider(Model<User>)
      .useValue(userModel)
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
    it(`should be create a ${User.name}`, async () => {
      jest.spyOn(encodeService, 'hash').mockResolvedValue(new HashMock().getMock());
      await expect(repository.create(user)).resolves.toBeInstanceOf(Model<User>);
    });
  });

  describe(`${UserRepository.name}.${UserRepository.prototype.existsByEmail.name}`, () => {
    it(`should be return if ${User.name} exists by email`, async () => {
      const user = await repository.create(new UserMock());
      await expect(repository.existsByEmail(user.email)).resolves.toBe(true);
    });
  });

  describe(`${UserRepository.name}.${UserRepository.prototype.existsByName.name}`, () => {
    it(`should be return if ${User.name} exists by name`, async () => {
      const user = await repository.create(new UserMock());
      await expect(repository.existsByName(user.name)).resolves.toBe(true);
    });
  });

  describe(`${UserRepository.name}.${UserRepository.prototype.findById.name}`, () => {
    it(`should be return a ${User.name} by id`, async () => {
      const user = await repository.create(new UserMock());
      await expect(repository.findById(user.id)).resolves.toBeInstanceOf(Model<User>);
    });
  });

  describe(`${UserRepository.name}.${UserRepository.prototype.findAll.name}`, () => {
    it(`should be return array of ${User.name}`, async () => {
      await repository.create(new UserMock());
      await expect(repository.findAll()).resolves.toBeInstanceOf(Array<User[]>);
    });
  });

  describe(`${UserRepository.name}.${UserRepository.prototype.existsByEmailExcludingSelf.name}`, () => {
    it(`should return false when email belongs to the same user`, async () => {
      const user = await repository.create(new UserMock());
      await expect(repository.existsByEmailExcludingSelf(user.email, user.id as string)).resolves.toBe(false);
    });

    it(`should return true when email belongs to a different user`, async () => {
      const user1 = await repository.create(new UserMock());
      const user2 = await repository.create(new UserMock().randomize());
      await expect(repository.existsByEmailExcludingSelf(user1.email, user2.id as string)).resolves.toBe(true);
    });
  });

  describe(`${UserRepository.name}.${UserRepository.prototype.existsByNameExcludingSelf.name}`, () => {
    it(`should return false when name belongs to the same user`, async () => {
      const user = await repository.create(new UserMock());
      await expect(repository.existsByNameExcludingSelf(user.name, user.id as string)).resolves.toBe(false);
    });

    it(`should return true when name belongs to a different user`, async () => {
      const user1 = await repository.create(new UserMock());
      const user2 = await repository.create(new UserMock().randomize());
      await expect(repository.existsByNameExcludingSelf(user1.name, user2.id as string)).resolves.toBe(true);
    });
  });

  describe(`${UserRepository.name}.${UserRepository.prototype.softDelete.name}`, () => {
    it(`should set isActive=false and deletedAt on user`, async () => {
      const user = await repository.create(new UserMock());
      expect(user.isActive).toBe(true);
      expect(user.deletedAt).toBeUndefined();

      const result = await repository.softDelete(user.id as string);
      expect(result.isActive).toBe(false);
      expect(result.deletedAt).toBeDefined();
    });

    it(`should return the updated user document`, async () => {
      const user = await repository.create(new UserMock());
      const result = await repository.softDelete(user.id as string);
      expect(result).toBeInstanceOf(Model<User>);
      expect(result.id).toBe(user.id);
    });
  });

  describe(`${UserRepository.name}.${UserRepository.prototype.findPaginated.name}`, () => {
    it('should return paginated users with default params', async () => {
      await repository.create(new UserMock());
      await repository.create(new UserMock().randomize());

      const result = await repository.findPaginated({ page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' });

      expect(result.users).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should respect limit and skip for pagination', async () => {
      for (let i = 0; i < 5; i++) {
        await repository.create(new UserMock().randomize());
      }

      const result = await repository.findPaginated({ page: 1, limit: 2, sortBy: 'createdAt', sortOrder: 'desc' });

      expect(result.users).toHaveLength(2);
      expect(result.total).toBe(5);
    });

    it('should filter by role', async () => {
      const adminUser = new UserMock();
      adminUser.role = 'admin' as any;
      await repository.create(adminUser);

      const viewerUser = new UserMock().randomize();
      viewerUser.role = 'viewer' as any;
      await repository.create(viewerUser);

      const result = await repository.findPaginated({
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        role: 'admin',
      });

      expect(result.users).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.users[0].role).toBe('admin');
    });

    it('should filter by isActive', async () => {
      const activeUser = new UserMock();
      await repository.create(activeUser);

      const inactiveUser = new UserMock().randomize();
      inactiveUser.isActive = false;
      await repository.create(inactiveUser);

      const result = await repository.findPaginated({
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        isActive: true,
      });

      expect(result.users).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.users[0].isActive).toBe(true);
    });

    it('should search across name, lastName, email, userName case-insensitively', async () => {
      const juanUser = new UserMock();
      juanUser.name = 'Juan';
      juanUser.lastName = 'Pérez';
      juanUser.email = 'juan@example.com';
      await repository.create(juanUser);

      const mariaUser = new UserMock().randomize();
      mariaUser.name = 'María';
      mariaUser.email = 'maria@example.com';
      await repository.create(mariaUser);

      const result = await repository.findPaginated({
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        search: 'juan',
      });

      expect(result.users).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.users[0].name).toBe('Juan');
    });

    it('should exclude soft-deleted users by default', async () => {
      const activeUser = new UserMock();
      await repository.create(activeUser);

      const deletedUser = new UserMock().randomize();
      deletedUser.deletedAt = new Date();
      deletedUser.isActive = false;
      await repository.create(deletedUser);

      const result = await repository.findPaginated({
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      expect(result.users).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.users[0].deletedAt).toBeUndefined();
    });

    it('should sort by field ascending', async () => {
      const userA = new UserMock();
      userA.name = 'Carlos';
      await repository.create(userA);

      const userB = new UserMock().randomize();
      userB.name = 'Ana';
      await repository.create(userB);

      const userC = new UserMock().randomize();
      userC.name = 'Bruno';
      await repository.create(userC);

      const result = await repository.findPaginated({
        page: 1,
        limit: 20,
        sortBy: 'name',
        sortOrder: 'asc',
      });

      expect(result.users).toHaveLength(3);
      expect(result.users[0].name).toBe('Ana');
      expect(result.users[1].name).toBe('Bruno');
      expect(result.users[2].name).toBe('Carlos');
    });

    it('should return empty results when no users match', async () => {
      const result = await repository.findPaginated({
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        role: 'superadmin',
      });

      expect(result.users).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should combine role + isActive + search filters', async () => {
      const matchingUser = new UserMock();
      matchingUser.name = 'Juan';
      matchingUser.role = 'admin' as any;
      matchingUser.isActive = true;
      await repository.create(matchingUser);

      const wrongRole = new UserMock().randomize();
      wrongRole.name = 'Juan';
      wrongRole.isActive = true;
      wrongRole.role = 'user' as any;
      await repository.create(wrongRole);

      const wrongActive = new UserMock().randomize();
      wrongActive.name = 'Juan';
      wrongActive.isActive = false;
      wrongActive.role = 'admin' as any;
      await repository.create(wrongActive);

      const result = await repository.findPaginated({
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        role: 'admin',
        isActive: true,
        search: 'juan',
      });

      expect(result.users).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.users[0].name).toBe('Juan');
    });
  });
});
