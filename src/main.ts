import fastifyCompress from '@fastify/compress';
import fastifyHelmet from '@fastify/helmet';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from './common/pipes/validation.pipe';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { Logger } from 'nestjs-pino';
import hyperid from 'hyperid';
import { HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app/app.module';

import { isProd } from './common/utils';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      genReqId: () => {
        return hyperid().uuid;
      },
    }),
  );

  // Use nestjs-pino as the global logger (replaces Fastify's built-in logger)
  app.useLogger(app.get(Logger));

  const configService = app.get(ConfigService);

  const corsOrigins = configService.getOrThrow('CORS_ORIGINS');
  const originsArray = corsOrigins.split(',').map((origin) => origin.trim()).filter(Boolean);
  app.enableCors({ origin: originsArray, credentials: false });

  app.useGlobalPipes(
    new ValidationPipe(),
  );

  await app.register(fastifyHelmet);
  await app.register(fastifyCompress, { encodings: ['gzip', 'deflate'] });

  const port = configService.get('PORT') ?? 3000;
  const host = configService.get('HOST') ?? '0.0.0.0';
  const name = configService.get('npm_package_name') || 'REST API Name';
  const description = configService.get('npm_package_description') || 'REST API Name Manager';
  const version = configService.get('npm_package_version') || '1.0.0';

  const swaggerConfig = new DocumentBuilder()
    .setTitle(name)
    .setDescription(description)
    .setVersion(version)
    .addBearerAuth()
    .addGlobalParameters({
      name: 'accept-language',
      in: 'header',
      required: false,
      description: 'Idioma: es (Español) | en (English) | pt (Português)',
      schema: { type: 'string', enum: ['es', 'en', 'pt'] },
    })
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);

  // Serve OpenAPI JSON spec (required by Scalar and compatible with Swagger UI clients)
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/docs-json', (_req: any, res: any) => {
    res.header('Content-Type', 'application/json');
    res.send(swaggerDocument);
  });

  // Scalar API Reference UI at /docs (drop-in replacement for Swagger UI)
  app.use(
    '/docs',
    apiReference({
      url: '/docs-json',
      withFastify: true,
    }),
  );

  await app.listen(port, host);
}
bootstrap();
