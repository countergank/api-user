import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../../src/app/app.module';
import { ValidationPipe } from '../../src/common/pipes/validation.pipe';

/**
 * Build the application under test.
 *
 * The harness deliberately mirrors `src/main.ts` on the pieces that shape the HTTP
 * contract, so an e2e can assert what a client actually receives:
 *
 * - it imports `AppModule`, which registers the global `AllExceptionsFilter` that
 *   normalizes every error into `ErrorResponseDto` — without it, error bodies keep
 *   the framework shape and every `code` assertion would be testing nothing;
 * - it installs the very same global `ValidationPipe` as production, imported from
 *   `src/common/pipes/validation.pipe` instead of taking options from here.
 *
 * That import is the point. A local copy of the pipe options silently drifts from
 * production: the stock Nest `ValidationPipe` this helper used to install derived
 * `code: HTTP_400` from the exception filter, while production publishes
 * `code: UA-COM-005` + `details`. COU-339 fixed the drift, and the surest way to keep
 * it fixed is to share the symbol rather than the options.
 *
 * Not replicated, on purpose: helmet, compress, CORS, the pino logger and the real
 * port. None of them change the error contract under test, and registering them here
 * would only add boot time. The app listens on port 0 so test files can run serially
 * on distinct ephemeral ports.
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const adapter = new FastifyAdapter({ logger: false });
  const app = moduleFixture.createNestApplication<NestFastifyApplication>(adapter);
  app.useGlobalPipes(new ValidationPipe());
  await app.init();
  await app.listen(0);

  return app;
}
