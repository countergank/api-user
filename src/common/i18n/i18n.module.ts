import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { I18nModule as NestI18nModule, QueryResolver, HeaderResolver } from 'nestjs-i18n';
import * as path from 'path';
import { I18nService } from './i18n.service';
import { I18nMiddleware } from './i18n.middleware';

@Module({
  imports: [
    NestI18nModule.forRoot({
      fallbackLanguage: 'es',
      loaderOptions: {
        path: path.join(__dirname, '/translations/'),
        watch: true,
      },
      resolvers: [{ use: QueryResolver, options: ['lang'] }, new HeaderResolver(['accept-language'])],
    }),
  ],
  providers: [I18nService],
  exports: [I18nService],
})
export class I18nModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(I18nMiddleware).forRoutes('*');
  }
}
