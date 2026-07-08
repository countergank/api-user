import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app/app.module';
import { createStandaloneLogger } from '../../common/logger';
import { EmailTemplateService } from '../../email/service/email-template.service';

async function seedEmailTemplates() {
  const logger = createStandaloneLogger('SeedEmailTemplates');

  try {
    logger.info('Iniciando aplicación...');
    const app = await NestFactory.createApplicationContext(AppModule);
    const templateService = app.get(EmailTemplateService);

    logger.info('Creando templates de email por defecto...');
    await templateService.seedDefaults();

    logger.info('Templates de email creados exitosamente');
    await app.close();
  } catch (error) {
    const err = error as Error;
    logger.error({ err }, 'Seed failed');
    process.exit(1);
  }
}

if (require.main === module) {
  seedEmailTemplates();
}

export { seedEmailTemplates };
