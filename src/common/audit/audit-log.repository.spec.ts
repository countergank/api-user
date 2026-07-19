import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, Model } from 'mongoose';
import { clearMongoCollection, clearMongoConnection, createConnection } from '../../../test/helpers';
import { AuditLog, AuditLogSchema } from './entities/audit-log.entity';
import { AuditLogRepository } from './audit-log.repository';

describe(AuditLogRepository.name, () => {
  let newMongod: MongoMemoryServer;
  let newMongoConnection: Connection;
  let auditLogModel: Model<AuditLog>;
  let repository: AuditLogRepository;

  beforeEach(async () => {
    const { mongod, mongoConnection } = await createConnection();
    newMongod = mongod;
    newMongoConnection = mongoConnection;

    auditLogModel = newMongoConnection.model(AuditLog.name, AuditLogSchema);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogRepository,
        {
          provide: getModelToken(AuditLog.name),
          useValue: auditLogModel,
        },
      ],
    }).compile();

    repository = module.get<AuditLogRepository>(AuditLogRepository);
  });

  afterAll(async () => {
    await clearMongoConnection(newMongoConnection, newMongod);
  });

  afterEach(async () => {
    await clearMongoCollection(newMongoConnection);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should persist an audit log entry', async () => {
      const entry = {
        correlationId: 'corr-123',
        userId: 'user-456',
        action: 'http.request',
        resource: 'http',
        ipAddress: '127.0.0.1',
        httpMethod: 'POST',
        endpoint: '/users',
        statusCode: 201,
        duration: 45,
      };

      const result = await repository.create(entry);
      expect(result.correlationId).toBe('corr-123');
      expect(result.userId).toBe('user-456');
      expect(result._id).toBeDefined();
    });
  });

  describe('findPaginated', () => {
    beforeEach(async () => {
      await auditLogModel.create([
        { correlationId: 'c1', userId: 'user-1', action: 'user.create', resource: 'user', ipAddress: '10.0.0.1', createdAt: new Date('2026-01-15') },
        { correlationId: 'c2', userId: 'user-2', action: 'user.update', resource: 'user', ipAddress: '10.0.0.2', createdAt: new Date('2026-02-20') },
        { correlationId: 'c3', userId: 'user-1', action: 'auth.login', resource: 'auth', ipAddress: '10.0.0.1', createdAt: new Date('2026-03-10') },
        { correlationId: 'c4', userId: 'user-3', action: 'user.delete', resource: 'user', ipAddress: '10.0.0.3', createdAt: new Date('2026-04-05') },
      ]);
    });

    it('should return all entries with default params', async () => {
      const result = await repository.findPaginated({ page: 1, limit: 20 });
      expect(result.data).toHaveLength(4);
      expect(result.total).toBe(4);
    });

    it('should filter by userId', async () => {
      const result = await repository.findPaginated({ page: 1, limit: 20, userId: 'user-1' });
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.data.every((d) => d.userId === 'user-1')).toBe(true);
    });

    it('should filter by action', async () => {
      const result = await repository.findPaginated({ page: 1, limit: 20, action: 'user.create' });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].action).toBe('user.create');
    });

    it('should filter by resource', async () => {
      const result = await repository.findPaginated({ page: 1, limit: 20, resource: 'auth' });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].resource).toBe('auth');
    });

    it('should filter by ipAddress', async () => {
      const result = await repository.findPaginated({ page: 1, limit: 20, ipAddress: '10.0.0.1' });
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter by date range', async () => {
      const result = await repository.findPaginated({
        page: 1,
        limit: 20,
        from: new Date('2026-02-01'),
        to: new Date('2026-03-31'),
      });
      expect(result.data).toHaveLength(2);
    });

    it('should respect pagination limits', async () => {
      const result = await repository.findPaginated({ page: 1, limit: 2 });
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(4);
    });

    it('should return empty when no matches', async () => {
      const result = await repository.findPaginated({ page: 1, limit: 20, userId: 'nonexistent' });
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });
});
