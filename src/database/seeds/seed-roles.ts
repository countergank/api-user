import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app/app.module';
import { createStandaloneLogger } from '../../common/logger';
import { RoleService } from '../../rbac/services/role.service';

async function seedRoles() {
  const logger = createStandaloneLogger('SeedRoles');

  try {
    logger.info('Iniciando aplicación...');
    const app = await NestFactory.createApplicationContext(AppModule);
    const roleService = app.get(RoleService);

    logger.info('Creando roles por defecto...');
    await roleService.seedDefaultRoles();

    logger.info('Roles creados exitosamente');
    await app.close();
  } catch (error) {
    const err = error as Error;
    logger.error({ err }, 'Seed failed');
    process.exit(1);
  }
}

if (require.main === module) {
  seedRoles();
}

export { seedRoles };
