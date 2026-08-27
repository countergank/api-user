import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';
import { TerminusModule } from '@nestjs/terminus';
import { ClsModule } from 'nestjs-cls';
import { LoggerModule } from 'nestjs-pino';
import { ConfigModuleOption } from '../config/custom-module-options/config-module-option';
import { MongooseModuleOption } from '../config/custom-module-options/mongoose-module-option';
import { AppConfigModule } from '../config/app-config.module';
import { DynamicThrottlerGuard } from '../config/throttle/dynamic-throttler.guard';
import { ExampleMicroservice } from '../config/custom-providers/microservices';
import { RedisModule } from '../config/redis/redis.module';
import { CacheModule } from '../config/cache/cache.module';
import { ParameterModule } from '../config/parameters/parameter.module';
import { ParameterAdminModule } from '../config/parameters/parameter-admin.module';
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
import { buildLoggerConfig } from '../common/logger-config';
import { AppController } from './controller/app.controller';
import { AppService } from './service/app.service';

@Module({
  controllers: [AppController],
  providers: [
    AppService,
    ExampleMicroservice,
    {
      provide: APP_GUARD,
      useClass: DynamicThrottlerGuard,
    },
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
    LoggerModule.forRoot(buildLoggerConfig()),
    ClsModule.forRoot({ global: true, middleware: { mount: true } }),
    ConfigModule.forRoot(ConfigModuleOption),
    AppConfigModule,
    MongooseModule.forRootAsync({ useClass: MongooseModuleOption }),
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60,
          limit: 10,
        },
      ],
    }),
    TerminusModule,
    RedisModule,
    CacheModule,
    ParameterModule,
    ParameterAdminModule,
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
