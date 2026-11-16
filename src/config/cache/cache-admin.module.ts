import { Module } from '@nestjs/common';
import { CacheModule } from './cache.module';
import { CacheAdminController } from './cache-admin.controller';

@Module({
  imports: [CacheModule],
  controllers: [CacheAdminController],
})
export class CacheAdminModule {}
