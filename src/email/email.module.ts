import { Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmailTemplate, EmailTemplateSchema } from './entities/email-template.entity';
import { EmailLog, EmailLogSchema } from './entities/email-log.entity';
import { EmailController } from './controller/email.controller';
import { EmailTemplateController } from './controller/email-template.controller';
import { EmailProvider } from './interfaces/email-provider.interface';
import { createEmailProvider } from './email.provider.factory';
import { EmailService } from './service/email.service';
import { EmailTemplateService } from './service/email-template.service';
import { EmailTemplateRepository } from './repository/email-template.repository';
import { EmailLogRepository } from './repository/email-log.repository';
import { EmailListener } from './listeners/email.listener';
import { EMAIL_PROVIDER_TOKEN } from './constants/email.tokens';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EmailTemplate.name, schema: EmailTemplateSchema },
      { name: EmailLog.name, schema: EmailLogSchema },
    ]),
  ],
  controllers: [EmailController, EmailTemplateController],
  providers: [
    EmailService,
    EmailTemplateService,
    EmailTemplateRepository,
    EmailLogRepository,
    EmailListener,
    {
      provide: EMAIL_PROVIDER_TOKEN,
      useFactory: () => createEmailProvider(),
    },
  ],
  exports: [EmailService],
})
export class EmailModule implements OnModuleInit {
  constructor(private readonly templateService: EmailTemplateService) {}

  async onModuleInit() {
    await this.templateService.seedDefaults();
  }
}
