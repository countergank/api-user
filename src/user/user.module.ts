import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EncodeService } from '../encode/encode.service';
import { User, UserSchema } from './entities/user.entity';
import { UserController } from './user.controller';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
  controllers: [UserController],
  providers: [EncodeService, UserRepository, UserService],
  exports: [UserService],
})
export class UserModule {}
