import fastifyCompress from '@fastify/compress';
import fastifyHelmet from '@fastify/helmet';
import { VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import hyperid from 'hyperid';
import { AppModule } from './app/app.module';
import { isProd } from './common/utils';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: {
        redact: ['headers.authorization'],
        timestamp: () => new Date().toISOString(),
        level: isProd() ? 'info' : 'debug',
      },
      genReqId: () => {
        return hyperid().uuid;
      },
    }),
  );

  app.enableCors();
  app.enableVersioning({ type: VersioningType.URI });

  await app.register(fastifyHelmet);
  await app.register(fastifyCompress, { encodings: ['gzip', 'deflate'] });

  const configService = app.get(ConfigService);
  const port = configService.get('PORT') ?? 3000;
  const host = configService.get('HOST') ?? '0.0.0.0';
  const name = configService.get('npm_package_name') || 'REST API Name';
  const description = configService.get('npm_package_description') || 'REST API Name Manager';
  const version = configService.get('npm_package_version') || '1.0.0';

  const swaggerConfig = new DocumentBuilder().setTitle(name).setDescription(description).setVersion(version).build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('/docs', app, swaggerDocument, { customSiteTitle: `${String(name).toUpperCase()} Docs` });

  await app.listen(port, host);
}
bootstrap();
