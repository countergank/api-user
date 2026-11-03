import request from 'supertest';
import fastifyCompress from '@fastify/compress';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { ValidationPipe } from '../../../src/common/pipes/validation.pipe';
import { COMPRESSION_OPTIONS } from '../../../src/config/compression.options';
import { AppModule } from '../../../src/app/app.module';

describe('Response compression (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const adapter = new FastifyAdapter({ logger: false });
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication<NestFastifyApplication>(adapter);
    app.useGlobalPipes(new ValidationPipe());
    await app.register(fastifyCompress, COMPRESSION_OPTIONS);
    // A payload larger than the compression threshold, mirroring /docs-json.
    const httpAdapter = app.getHttpAdapter();
    httpAdapter.get('/e2e/large', (_req: any, res: any) => {
      res.header('Content-Type', 'application/json');
      res.send({ padding: 'x'.repeat(64 * 1024) });
    });
    await app.init();
    await app.listen(0);
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  it('prefers Brotli when the client offers it and compresses large payloads', async () => {
    // supertest cannot decompress brotli, so read the body as binary and assert via headers.
    const response = await request(app.getHttpServer())
      .get('/e2e/large')
      .set('Accept-Encoding', 'br, gzip, deflate')
      .responseType('arraybuffer')
      .expect(200)
      .expect('Content-Encoding', 'br');

    expect(response.body.length ?? Buffer.byteLength(response.body)).toBeGreaterThan(0);
  });

  it('falls back to gzip when the client does not support Brotli', async () => {
    const response = await request(app.getHttpServer())
      .get('/e2e/large')
      .set('Accept-Encoding', 'gzip, deflate')
      .expect(200);

    expect(response.headers['content-encoding']).toBe('gzip');
  });

  it('does not compress responses below the threshold', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .set('Accept-Encoding', 'br, gzip, deflate')
      .expect(200);

    expect(response.headers['content-encoding']).toBeUndefined();
  });
});
