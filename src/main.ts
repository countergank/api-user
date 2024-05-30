import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableVersioning({ type: VersioningType.URI });
  app.enableCors();
  app.enableShutdownHooks();
  const configService = app.get(ConfigService);
  const port = configService.get('PORT') ?? 3000;
  const host = configService.get('HOST') ?? '0.0.0.0';
  const name = configService.get('npm_package_name') || 'REST API Name';
  const description = configService.get('npm_package_description') || 'REST API Name Manager';
  const version = configService.get('npm_package_version') || '1.0.0';

  const config = new DocumentBuilder().setTitle(name).setDescription(description).setVersion(version).build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
  await app.listen(port, host);
}
bootstrap();
