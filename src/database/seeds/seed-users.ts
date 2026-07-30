/**
 * Seed para crear usuarios con diferentes roles.
 * Ejecución: docker compose exec api-user npx ts-node src/database/seeds/seed-users.ts
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app/app.module';
import { createStandaloneLogger } from '../../common/logger';
import { UserRole } from '../../user/entities/user.entity';
import { UserService } from '../../user/service/user.service';

async function seedUsers() {
  const logger = createStandaloneLogger('SeedUsers');

  try {
    logger.info('Iniciando...');
    const app = await NestFactory.createApplicationContext(AppModule);
    const userService = app.get(UserService);

    logger.info('Creando usuarios con diferentes roles...');

    // Admin users
    try {
      await userService.createWithRole({
        email: 'admin@test.com',
        userName: 'admin',
        password: 'XyzAdmin1@',
        name: 'Admin',
        lastName: 'User',
        role: UserRole.ADMIN,
        permissions: [],
        isActive: true,
      });
      logger.info('✓ admin@test.com / XyzAdmin1@ -> admin');
    } catch (_e) {
      logger.info('admin@test.com ya existe');
    }

    try {
      await userService.createWithRole({
        email: 'admin2@test.com',
        userName: 'admin2',
        password: 'XyzAdmin2@',
        name: 'Second',
        lastName: 'Admin',
        role: UserRole.ADMIN,
        permissions: [],
        isActive: true,
      });
      logger.info('✓ admin2@test.com / XyzAdmin2@ -> admin');
    } catch (_e) {
      logger.info('admin2@test.com ya existe');
    }

    // Regular users
    try {
      await userService.createWithRole({
        email: 'user@test.com',
        userName: 'user',
        password: 'XyzUser1@',
        name: 'Regular',
        lastName: 'User',
        role: UserRole.USER,
        permissions: [],
        isActive: true,
      });
      logger.info('✓ user@test.com / XyzUser1@ -> user');
    } catch (_e) {
      logger.info('user@test.com ya existe');
    }

    // Viewer users
    try {
      await userService.createWithRole({
        email: 'viewer@test.com',
        userName: 'viewer',
        password: 'XyzViewer1@',
        name: 'Viewer',
        lastName: 'User',
        role: UserRole.VIEWER,
        permissions: [],
        isActive: true,
      });
      logger.info('✓ viewer@test.com / XyzViewer1@ -> viewer');
    } catch (_e) {
      logger.info('viewer@test.com ya existe');
    }

    logger.info('Seed completado exitosamente');
    await app.close();
  } catch (error) {
    const err = error as Error;
    logger.error({ err }, 'Seed failed');
    process.exit(1);
  }
}

seedUsers();
