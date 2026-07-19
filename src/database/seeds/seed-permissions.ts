import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app/app.module';
import { createStandaloneLogger } from '../../common/logger';
import { PermissionService } from '../../rbac/services/permission.service';

async function seedPermissions() {
  const logger = createStandaloneLogger('SeedPermissions');

  try {
    logger.info('Iniciando aplicación...');
    const app = await NestFactory.createApplicationContext(AppModule);
    const permissionService = app.get(PermissionService);

    logger.info('Creando permisos por defecto...');
    await permissionService.seedDefaultPermissions();

    logger.info('Permisos creados exitosamente');
    await app.close();
  } catch (error) {
    const err = error as Error;
    logger.error({ err }, 'Seed failed');
    process.exit(1);
  }
}

if (require.main === module) {
  seedPermissions();
}

export { seedPermissions };
