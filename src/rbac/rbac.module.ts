import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { I18nModule } from '../common/i18n/i18n.module';
import { Permission, PermissionSchema } from './entities/permission.entity';
import { Role, RoleSchema } from './entities/role.entity';
import { PermissionService } from './services/permission.service';
import { RoleService } from './services/role.service';
import { PermissionController } from './controllers/permission.controller';
import { RoleController } from './controllers/role.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Permission.name, schema: PermissionSchema },
      { name: Role.name, schema: RoleSchema },
    ]),
    I18nModule,
  ],
  controllers: [PermissionController, RoleController],
  providers: [PermissionService, RoleService],
  exports: [PermissionService, RoleService],
})
export class RbacModule {}
