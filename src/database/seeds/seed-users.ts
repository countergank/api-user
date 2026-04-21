/**
 * Seed para crear usuarios con diferentes roles.
 * Ejecución: docker compose exec api-user npx ts-node src/database/seeds/seed-users.ts
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app/app.module';
import { UserService } from '../../user/service/user.service';
import { CreateUserDTO } from '../../user/dto/create-user.dto';
import { CustomLogger } from '../../common/logger';
import { UserRole } from '../../user/entities/user.entity';

async function seedUsers() {
  const logger = new CustomLogger('SeedUsers');

  try {
    logger.log('Iniciando...');
    const app = await NestFactory.createApplicationContext(AppModule);
    const userService = app.get(UserService);

    logger.log('Creando usuarios con diferentes roles...');

    // Admin users
    try {
      const adminDto = new CreateUserDTO();
      adminDto.email = 'admin@test.com';
      adminDto.userName = 'admin';
      adminDto.password = 'Admin123!';
      adminDto.name = 'Admin';
      adminDto.lastName = 'User';
      const admin = await userService.create(adminDto);
      await userService.update(admin.id, { role: UserRole.ADMIN });
      logger.log('✓ admin@test.com / Admin123! -> admin');
    } catch (e) {
      logger.log('admin@test.com ya existe');
    }

    try {
      const admin2Dto = new CreateUserDTO();
      admin2Dto.email = 'admin2@test.com';
      admin2Dto.userName = 'admin2';
      admin2Dto.password = 'Admin123!';
      admin2Dto.name = 'Second';
      admin2Dto.lastName = 'Admin';
      const admin2 = await userService.create(admin2Dto);
      await userService.update(admin2.id, { role: UserRole.ADMIN });
      logger.log('✓ admin2@test.com / Admin123! -> admin');
    } catch (e) {
      logger.log('admin2@test.com ya existe');
    }

    // Regular users
    try {
      const userDto = new CreateUserDTO();
      userDto.email = 'user@test.com';
      userDto.userName = 'user';
      userDto.password = 'User123!';
      userDto.name = 'Regular';
      userDto.lastName = 'User';
      const user = await userService.create(userDto);
      await userService.update(user.id, { role: UserRole.USER });
      logger.log('✓ user@test.com / User123! -> user');
    } catch (e) {
      logger.log('user@test.com ya existe');
    }

    // Viewer users
    try {
      const viewerDto = new CreateUserDTO();
      viewerDto.email = 'viewer@test.com';
      viewerDto.userName = 'viewer';
      viewerDto.password = 'Viewer123!';
      viewerDto.name = 'Viewer';
      viewerDto.lastName = 'User';
      const viewer = await userService.create(viewerDto);
      await userService.update(viewer.id, { role: UserRole.VIEWER });
      logger.log('✓ viewer@test.com / Viewer123! -> viewer');
    } catch (e) {
      logger.log('viewer@test.com ya existe');
    }

    logger.log('Seed completado exitosamente');
    await app.close();
  } catch (error) {
    logger.error('Error:', error);
    process.exit(1);
  }
}

seedUsers();