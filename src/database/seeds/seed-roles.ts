import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app/app.module';
import { RoleService } from '../../rbac/services/role.service';
import { CustomLogger } from '../../common/logger';

async function seedRoles() {
  const logger = new CustomLogger('SeedRoles');

  try {
    logger.log('Iniciando aplicación...');
    const app = await NestFactory.createApplicationContext(AppModule);
    const roleService = app.get(RoleService);

    logger.log('Creando roles por defecto...');
    await roleService.seedDefaultRoles();

    logger.log('Roles creados exitosamente');
    await app.close();
  } catch (error) {
    logger.error('Error creando roles:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  seedRoles();
}

export { seedRoles };
