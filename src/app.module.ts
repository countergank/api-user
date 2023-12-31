import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModuleOptions } from './config/ConfigModuleOptions';
import { MongooseModuleAsyncOptions } from './config/MongooseConfigService';
import { UserModule } from './user/user.module';

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
