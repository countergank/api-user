import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app/app.module';
import { CustomLogger } from '../../common/logger';
import { PermissionService } from '../../rbac/services/permission.service';

async function seedPermissions() {
  const logger = new CustomLogger('SeedPermissions');

  try {
    logger.log('Iniciando aplicación...');
    const app = await NestFactory.createApplicationContext(AppModule);
    const permissionService = app.get(PermissionService);

    logger.log('Creando permisos por defecto...');
    await permissionService.seedDefaultPermissions();

    logger.log('Permisos creados exitosamente');
    await app.close();
  } catch (error) {
    const err = error as Error;
    logger.error(err.message, err.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  seedPermissions();
}

export { seedPermissions };
