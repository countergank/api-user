import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';
import { TerminusModule } from '@nestjs/terminus';
import { ClsModule } from 'nestjs-cls';
import { ConfigModuleOption } from '../config/custom-module-options/config-module-option';
import { MongooseModuleOption } from '../config/custom-module-options/mongoose-module-option';
import { ExampleMicroservice } from '../config/custom-providers/microservices';
import { RedisModule } from '../config/redis/redis.module';
import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';
import { RbacModule } from '../rbac/rbac.module';
import { EmailModule } from '../email/email.module';
import { I18nModule } from '../common/i18n/i18n.module';
import { AuditModule } from '../common/audit/audit.module';
import { AuditInterceptor } from '../common/audit/audit.interceptor';
import { AuditAspectInterceptor } from '../common/audit/audit-aspect.interceptor';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';
import { TraceIdMiddleware } from '../common/middleware/trace-id.middleware';
import { AppController } from './controller/app.controller';
import { AppService } from './service/app.service';

@Module({
  controllers: [AppController],
  providers: [
    AppService,
    ExampleMicroservice,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditAspectInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
  imports: [
    ClsModule.forRoot({ global: true, middleware: { mount: true } }),
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
    TerminusModule,
    RedisModule,
    I18nModule,
    AuditModule,
    UserModule,
    AuthModule,
    RbacModule,
    EmailModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TraceIdMiddleware).forRoutes('*');
  }
}
