import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModuleOption } from '../config/custom-module-options/config-module-option';
import { MongooseModuleOption } from '../config/custom-module-options/mongoose-module-option';
import { ExampleMicroservice } from '../config/custom-providers/microservices';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';
import { RbacModule } from '../rbac/rbac.module';
import { EmailModule } from '../email/email.module';
import { I18nModule } from '../common/i18n/i18n.module';
import { AppController } from './controller/app.controller';
import { AppService } from './service/app.service';

@Module({
  controllers: [AppController],
  providers: [AppService, ExampleMicroservice],
  imports: [
    ConfigModule.forRoot(ConfigModuleOption),
    MongooseModule.forRootAsync({ useClass: MongooseModuleOption }),
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('THROTTLE_TTL', 60),
            limit: config.get<number>('THROTTLE_LIMIT', 10),
          },
        ],
      }),
    }),
    I18nModule,
    UserModule,
    AuthModule,
    RbacModule,
    EmailModule,
  ],
})
export class AppModule {}
