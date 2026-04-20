import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app/app.module';
import { PermissionService } from '../../rbac/services/permission.service';
import { CustomLogger } from '../../common/logger';

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
    logger.error('Error creando permisos:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  seedPermissions();
}

export { seedPermissions };
