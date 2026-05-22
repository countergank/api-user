import { Global, Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule, InjectModel } from '@nestjs/mongoose';
import { ClsModule } from 'nestjs-cls';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { AuditLog, AuditLogSchema } from './entities/audit-log.entity';
import { AuditLogRepository } from './audit-log.repository';
import { AuditService } from './audit.service';
import { AuditListener } from './audit.listener';
import { AuditInterceptor } from './audit.interceptor';
import { AuditAspectInterceptor } from './audit-aspect.interceptor';
import { AuditController } from './audit.controller';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([{ name: AuditLog.name, schema: AuditLogSchema }]),
    ClsModule,
  ],
  controllers: [AuditController],
  providers: [AuditLogRepository, AuditService, AuditListener, AuditInterceptor, AuditAspectInterceptor],
  exports: [AuditService, AuditLogRepository, AuditInterceptor, AuditAspectInterceptor],
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
    } catch (_error) {
      // Index may already exist; this is non-fatal
    }
  }
}
