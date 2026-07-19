import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { Connection, Model } from 'mongoose';
import { clearMongoCollection, clearMongoConnection, createConnection } from '../../../../test/helpers';
import { AuditLog, AuditLogSchema } from './audit-log.entity';

describe('AuditLog Entity', () => {
  let newMongod: MongoMemoryReplSet;
  let newMongoConnection: Connection;
  let auditLogModel: Model<AuditLog>;

  beforeEach(async () => {
    const { mongod, mongoConnection } = await createConnection();
    newMongod = mongod;
    newMongoConnection = mongoConnection;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: getModelToken(AuditLog.name),
          useValue: newMongoConnection.model(AuditLog.name, AuditLogSchema),
        },
      ],
    }).compile();

    auditLogModel = module.get<Model<AuditLog>>(getModelToken(AuditLog.name));
  });

  afterAll(async () => {
    await clearMongoConnection(newMongoConnection, newMongod);
  });

  afterEach(async () => {
    await clearMongoCollection(newMongoConnection);
  });

  it('should be defined', () => {
    expect(auditLogModel).toBeDefined();
  });

  describe('schema fields', () => {
    it('should create audit log with all required fields', async () => {
      const entry = new auditLogModel({
        correlationId: 'corr-123',
        userId: 'user-456',
        action: 'http.request',
        resource: 'http',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        httpMethod: 'POST',
        endpoint: '/users',
        statusCode: 201,
        duration: 45,
      });
      const saved = await entry.save();
      expect(saved.correlationId).toBe('corr-123');
      expect(saved.userId).toBe('user-456');
      expect(saved.action).toBe('http.request');
      expect(saved.resource).toBe('http');
      expect(saved.statusCode).toBe(201);
      expect(saved.duration).toBe(45);
    });

    it('should support optional resourceId', async () => {
      const entry = new auditLogModel({
        correlationId: 'corr-789',
        action: 'user.create',
        resource: 'user',
        resourceId: 'new-user-id',
      });
      const saved = await entry.save();
      expect(saved.resourceId).toBe('new-user-id');
    });

    it('should support businessContext with before/after', async () => {
      const entry = new auditLogModel({
        correlationId: 'corr-abc',
        action: 'user.update',
        resource: 'user',
        resourceId: 'user-123',
        businessContext: {
          before: { name: 'Old Name' },
          after: { name: 'New Name' },
        },
      });
      const saved = await entry.save();
      expect(saved.businessContext).toEqual({
        before: { name: 'Old Name' },
        after: { name: 'New Name' },
      });
    });

    it('should support metadata object', async () => {
      const entry = new auditLogModel({
        correlationId: 'corr-meta',
        action: 'http.request',
        resource: 'http',
        metadata: { requestBody: { email: 'test@test.com' }, headers: { 'x-custom': 'value' } },
      });
      const saved = await entry.save();
      expect(saved.metadata).toEqual({
        requestBody: { email: 'test@test.com' },
        headers: { 'x-custom': 'value' },
      });
    });

    it('should auto-set createdAt timestamp', async () => {
      const entry = new auditLogModel({
        correlationId: 'corr-time',
        action: 'http.request',
        resource: 'http',
      });
      const saved = await entry.save();
      expect(saved.createdAt).toBeDefined();
    });

    it('should allow anonymous userId', async () => {
      const entry = new auditLogModel({
        correlationId: 'corr-anon',
        userId: 'anonymous',
        action: 'http.request',
        resource: 'http',
      });
      const saved = await entry.save();
      expect(saved.userId).toBe('anonymous');
    });
  });

  describe('indexes', () => {
    beforeEach(async () => {
      // Ensure model is synced to create indexes
      await auditLogModel.syncIndexes();
    });

    it('should have index on correlationId', async () => {
      const indexes = await auditLogModel.collection.indexes();
      const corrIndex = indexes.find((idx) => idx.key && idx.key.correlationId === 1);
      expect(corrIndex).toBeDefined();
    });

    it('should have index on userId', async () => {
      const indexes = await auditLogModel.collection.indexes();
      const userIdIndex = indexes.find((idx) => idx.key && idx.key.userId === 1);
      expect(userIdIndex).toBeDefined();
    });

    it('should have index on action', async () => {
      const indexes = await auditLogModel.collection.indexes();
      const actionIndex = indexes.find((idx) => idx.key && idx.key.action === 1);
      expect(actionIndex).toBeDefined();
    });

    it('should have index on resource', async () => {
      const indexes = await auditLogModel.collection.indexes();
      const resourceIndex = indexes.find((idx) => idx.key && idx.key.resource === 1);
      expect(resourceIndex).toBeDefined();
    });
  });
});
