import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EncodeService } from '../encode/encode.service';
import { Permission, PermissionSchema } from '../rbac/entities/permission.entity';
import { UserController } from './controller/user.controller';
import { UserProfileController } from './controller/user-profile.controller';
import { User, UserSchema } from './entities/user.entity';
import { UserRepository } from './repository/user.repository';
import { UserService } from './service/user.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      // Registered here so the admin create path can validate explicit permissions
      // against the catalog: importing RbacModule would be a circular dependency.
      { name: Permission.name, schema: PermissionSchema },
    ]),
  ],
  controllers: [UserController, UserProfileController],
  providers: [EncodeService, UserRepository, UserService],
  exports: [UserService],
})
export class UserModule {}
