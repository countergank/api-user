import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClsModule } from 'nestjs-cls';
import { Connection, Model } from 'mongoose';
import { clearMongoConnection, createConnection, TestMongo } from '../../test-utils';
import { AuditModule } from './audit.module';
import { AuditLog, AuditLogSchema } from './entities/audit-log.entity';
import { AuditLogRepository } from './audit-log.repository';
import { AuditService } from './audit.service';
import { AuditListener } from './audit.listener';
import { I18nModule } from '../../common/i18n/i18n.module';

describe(AuditModule.name, () => {
  let newMongod: TestMongo['mongod'];
  let newUri: string;
  let newMongoConnection: Connection;

  beforeEach(async () => {
    const { uri, mongod, mongoConnection } = await createConnection('audit-module');
    newUri = uri;
    newMongod = mongod;
    newMongoConnection = mongoConnection;
  });

  afterEach(async () => {
    await clearMongoConnection(newMongoConnection, newMongod);
  });

  it('should compile the module', async () => {
    const uri = newUri;
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

    expect(module).toBeDefined();
    expect(module.get(AuditLogRepository)).toBeDefined();
    expect(module.get(AuditService)).toBeDefined();
    expect(module.get(AuditListener)).toBeDefined();
  });

  it('should export AuditService', async () => {
    const uri = newUri;
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

    const exportedModule = module.get(AuditModule);
    expect(exportedModule).toBeDefined();
  });
});
