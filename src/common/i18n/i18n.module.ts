import { Module, NestModule, MiddlewareConsumer, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { I18nModule as NestI18nModule, AcceptLanguageResolver } from 'nestjs-i18n';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { I18nService } from './i18n.service';
import { I18nMiddleware } from './i18n.middleware';
import { I18nTranslation, I18nTranslationSchema } from './entities/i18n-translation.entity';
import { I18nAdminController } from './i18n-admin.controller';

function resolveTranslationsPath(): string {
  // Production: dist/common/i18n/translations/
  const distPath = path.join(__dirname, 'translations');
  if (fs.existsSync(distPath)) return distPath;

  // Development / Fallback: src/common/i18n/translations/
  const srcPath = path.join(process.cwd(), 'src', 'common', 'i18n', 'translations');
  if (fs.existsSync(srcPath)) return srcPath;

  // Last resort
  return distPath;
}

@Global()
@Module({
  imports: [
    NestI18nModule.forRoot({
      fallbackLanguage: 'es',
      loaderOptions: {
        path: resolveTranslationsPath(),
        watch: true,
      },
      resolvers: [AcceptLanguageResolver],
    }),
    MongooseModule.forFeature([{ name: I18nTranslation.name, schema: I18nTranslationSchema }]),
  ],
  controllers: [I18nAdminController],
  providers: [I18nService],
  exports: [I18nService],
})
export class I18nModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(I18nMiddleware).forRoutes('*');
  }
}
