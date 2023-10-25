import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigOptions } from './config/ConfigOptions';
import { MongooseOptions } from './config/MongooseOptions';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot(new ConfigOptions()),
    MongooseModule.forRootAsync({ useClass: MongooseOptions }),
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
