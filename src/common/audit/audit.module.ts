import { Global, Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule, InjectModel } from '@nestjs/mongoose';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ClsModule } from 'nestjs-cls';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { AuditLog, AuditLogSchema } from './entities/audit-log.entity';
import { AuditLogRepository } from './audit-log.repository';
import { AuditService } from './audit.service';
import { AuditListener } from './audit.listener';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([{ name: AuditLog.name, schema: AuditLogSchema }]),
    EventEmitterModule,
    ClsModule,
  ],
  providers: [AuditLogRepository, AuditService, AuditListener],
  exports: [AuditService, AuditLogRepository],
})
export class AuditModule implements OnModuleInit {
  constructor(
    private readonly configService: ConfigService,
    @InjectModel(AuditLog.name) private readonly auditLogModel: Model<AuditLog>,
  ) {}

  async onModuleInit() {
    const retentionDays = this.configService.get<number>('AUDIT_RETENTION_DAYS', 30);
    const expireAfterSeconds = retentionDays * 86400;

    try {
      await this.auditLogModel.collection.createIndex(
        { createdAt: 1 },
        { expireAfterSeconds },
      );
    } catch (error) {
      // Index may already exist; this is non-fatal
    }
  }
}
