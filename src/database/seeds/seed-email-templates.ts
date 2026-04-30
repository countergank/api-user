import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app/app.module';
import { CustomLogger } from '../../common/logger';
import { EmailTemplateService } from '../../email/service/email-template.service';

async function seedEmailTemplates() {
  const logger = new CustomLogger('SeedEmailTemplates');

  try {
    logger.log('Iniciando aplicación...');
    const app = await NestFactory.createApplicationContext(AppModule);
    const templateService = app.get(EmailTemplateService);

    logger.log('Creando templates de email por defecto...');
    await templateService.seedDefaults();

    logger.log('Templates de email creados exitosamente');
    await app.close();
  } catch (error) {
    const err = error as Error;
    logger.error(err.message, err.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  seedEmailTemplates();
}

export { seedEmailTemplates };
