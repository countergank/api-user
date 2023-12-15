import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableVersioning({ type: VersioningType.URI });
  app.enableCors();
  app.enableShutdownHooks();
  const configService = app.get(ConfigService);
  const port = configService.get('PORT');

  const config = new DocumentBuilder()
    .setTitle('User Manager API')
    .setDescription('Application of user interface programming to user management')
    .setVersion('1.0')
    .addTag('User Manager API')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  await app.listen(port ?? 3000);
}
bootstrap();
