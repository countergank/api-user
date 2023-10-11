import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { validate } from './config/env.validation';
import { isProd } from './common/utils';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'local'}`,
      ignoreEnvFile: isProd() ? true : false,
      validate: validate,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
