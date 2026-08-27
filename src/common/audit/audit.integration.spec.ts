import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule } from '@nestjs/config';
import { ClsModule, ClsService } from 'nestjs-cls';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { Connection } from 'mongoose';
import { clearMongoConnection, createConnection } from '../../test-utils';
import { AuditModule } from './audit.module';
import { AuditLog, AuditLogSchema } from './entities/audit-log.entity';
import { AuditLogRepository } from './audit-log.repository';
import { AuditService } from './audit.service';
import { AuditListener } from './audit.listener';
import { AuditEvents } from './constants/audit.events';
import { I18nModule } from '../../common/i18n/i18n.module';
import { redactSensitiveFields } from './audit.listener';

describe('Audit Module Integration', () => {
  let newMongod: MongoMemoryReplSet;
  let newMongoConnection: Connection;

  beforeEach(async () => {
    const { mongod, mongoConnection } = await createConnection();
    newMongod = mongod;
    newMongoConnection = mongoConnection;
  });

  afterAll(async () => {
    await clearMongoConnection(newMongoConnection, newMongod);
  });

  describe('AuditLogRepository', () => {
    let repository: AuditLogRepository;

    beforeEach(async () => {
      const uri = newMongod.getUri();
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          MongooseModule.forRoot(uri),
          MongooseModule.forFeature([{ name: AuditLog.name, schema: AuditLogSchema }]),
          EventEmitterModule.forRoot(),
          ClsModule.forRoot({ global: true, middleware: { mount: true } }),
          ConfigModule.forRoot({
            isGlobal: true,
            load: [() => ({ AUDIT_ENABLED: 'true', AUDIT_RETENTION_DAYS: '30', AUDIT_LEVEL: 'standard' })],
          }),
          I18nModule,
          AuditModule,
        ],
      }).compile();

      repository = module.get<AuditLogRepository>(AuditLogRepository);
    });

    it('should create an audit log entry', async () => {
      const entry = await repository.create({
        correlationId: 'test-corr-1',
        userId: 'user-123',
        action: 'user.create',
        resource: 'user',
        resourceId: 'resource-123',
        ipAddress: '192.168.1.1',
        userAgent: 'TestAgent/1.0',
        httpMethod: 'POST',
        endpoint: '/admin/users',
        statusCode: 201,
        duration: 45,
      });

      expect(entry).toBeDefined();
      expect(entry.correlationId).toBe('test-corr-1');
      expect(entry.action).toBe('user.create');
      expect(entry.resource).toBe('user');
    });

    it('should find paginated audit logs with filters', async () => {
      // Create test entries
      await repository.create({
        correlationId: 'corr-1',
        userId: 'user-1',
        action: 'user.create',
        resource: 'user',
        ipAddress: '192.168.1.1',
      });
      await repository.create({
        correlationId: 'corr-2',
        userId: 'user-2',
        action: 'user.update',
        resource: 'user',
        ipAddress: '192.168.1.2',
      });
      await repository.create({
        correlationId: 'corr-3',
        userId: 'user-1',
        action: 'auth.login',
        resource: 'auth',
        ipAddress: '192.168.1.1',
      });

      // Filter by userId
      const resultByUser = await repository.findPaginated({
        page: 1,
        limit: 10,
        userId: 'user-1',
      });
      expect(resultByUser.total).toBe(2);
      expect(resultByUser.data).toHaveLength(2);

      // Filter by action
      const resultByAction = await repository.findPaginated({
        page: 1,
        limit: 10,
        action: 'auth.login',
      });
      expect(resultByAction.total).toBe(1);
      expect(resultByAction.data[0].action).toBe('auth.login');

      // Filter by resource
      const resultByResource = await repository.findPaginated({
        page: 1,
        limit: 10,
        resource: 'auth',
      });
      expect(resultByResource.total).toBe(1);

      // Filter by ipAddress
      const resultByIp = await repository.findPaginated({
        page: 1,
        limit: 10,
        ipAddress: '192.168.1.2',
      });
      expect(resultByIp.total).toBe(1);
    });

    it('should paginate correctly', async () => {
      // Create 5 entries
      for (let i = 0; i < 5; i++) {
        await repository.create({
          correlationId: `corr-${i}`,
          userId: `user-${i}`,
          action: 'test.action',
          resource: 'test',
        });
      }

      const page1 = await repository.findPaginated({ page: 1, limit: 2 });
      expect(page1.data).toHaveLength(2);
      expect(page1.total).toBe(5);

      const page2 = await repository.findPaginated({ page: 2, limit: 2 });
      expect(page2.data).toHaveLength(2);

      const page3 = await repository.findPaginated({ page: 3, limit: 2 });
      expect(page3.data).toHaveLength(1);
    });
  });

  describe('AuditService', () => {
    let service: AuditService;

    beforeEach(async () => {
      const uri = newMongod.getUri();
      const module: TestingModule = await Test.createTestingModule({
        imports: [
          MongooseModule.forRoot(uri),
          MongooseModule.forFeature([{ name: AuditLog.name, schema: AuditLogSchema }]),
          EventEmitterModule.forRoot(),
          ClsModule.forRoot({ global: true, middleware: { mount: true } }),
          ConfigModule.forRoot({
            isGlobal: true,
            load: [() => ({ AUDIT_ENABLED: 'true', AUDIT_RETENTION_DAYS: '30', AUDIT_LEVEL: 'standard' })],
          }),
          I18nModule,
          AuditModule,
        ],
      }).compile();

      service = module.get<AuditService>(AuditService);
    });

    it('should delegate to repository with normalized pagination', async () => {
      const result = await service.findPaginated({ page: 0, limit: 200 });
      // Service normalizes: page min 1, limit max 100
      expect(result.data).toBeDefined();
      expect(result.total).toBeDefined();
    });
  });

  describe('AuditListener redaction', () => {
    it('should redact password fields', () => {
      const obj = { password: 'secret123', email: 'test@example.com' };
      const result = redactSensitiveFields(obj);
      expect(result.password).toBe('[REDACTED]');
      expect(result.email).toBe('test@example.com');
    });

    it('should redact token fields (case-insensitive substring)', () => {
      const obj = {
        token: 'abc123',
        refreshToken: 'refresh-abc',
        resetPasswordToken: 'reset-abc',
        emailVerificationToken: 'verify-abc',
        pendingEmailToken: 'pending-abc',
      };
      const result = redactSensitiveFields(obj);
      expect(result.token).toBe('[REDACTED]');
      expect(result.refreshToken).toBe('[REDACTED]');
      expect(result.resetPasswordToken).toBe('[REDACTED]');
      expect(result.emailVerificationToken).toBe('[REDACTED]');
      expect(result.pendingEmailToken).toBe('[REDACTED]');
    });

    it('should recursively redact nested objects', () => {
      const obj = {
        user: {
          password: 'secret',
          profile: {
            token: 'nested-token',
            name: 'John',
          },
        },
      };
      const result = redactSensitiveFields(obj);
      expect((result as any).user.password).toBe('[REDACTED]');
      expect((result as any).user.profile.token).toBe('[REDACTED]');
      expect((result as any).user.profile.name).toBe('John');
    });

    it('should handle arrays', () => {
      const obj = {
        items: [{ password: 'secret1' }, { password: 'secret2' }],
      };
      const result = redactSensitiveFields(obj);
      expect((result as any).items[0].password).toBe('[REDACTED]');
      expect((result as any).items[1].password).toBe('[REDACTED]');
    });

    it('should not mutate non-object values', () => {
      expect(redactSensitiveFields(null)).toBe(null);
      expect(redactSensitiveFields(undefined)).toBe(undefined);
      expect(redactSensitiveFields('string')).toBe('string');
      expect(redactSensitiveFields(42)).toBe(42);
    });
  });
});
