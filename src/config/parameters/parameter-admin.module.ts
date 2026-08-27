import { Module } from '@nestjs/common';
import { ParameterModule } from './parameter.module';
import { ParameterAdminController } from './parameter-admin.controller';

@Module({
  imports: [ParameterModule],
  controllers: [ParameterAdminController],
})
export class ParameterAdminModule {}
