import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModuleOptions } from '../config/ConfigModuleOptions';
import { MongooseModuleAsyncOptions } from '../config/MongooseConfigService';
import { UserModule } from '../user/user.module';
import { AppController } from './controller/app.controller';
import { AppService } from './service/app.service';

@Module({
  imports: [
    ConfigModule.forRoot(new ConfigModuleOptions()),
    MongooseModule.forRootAsync({ useClass: MongooseModuleAsyncOptions }),
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
