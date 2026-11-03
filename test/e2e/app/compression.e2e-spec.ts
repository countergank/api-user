import request from 'supertest';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { ValidationPipe } from '../../../src/common/pipes/validation.pipe';
import { registerHttpCompression } from '../../../src/config/compression.options';
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
    await registerHttpCompression(app);
    // Fixed-size payloads around the compression threshold, mirroring /docs-json.
    const httpAdapter = app.getHttpAdapter();
    const largeRoute = (bytes: number) => (_req: any, res: any) => {
      res.header('Content-Type', 'application/json');
      res.send({ padding: 'x'.repeat(bytes) });
    };
    httpAdapter.get('/e2e/below-threshold', largeRoute(1360));
    httpAdapter.get('/e2e/above-threshold', largeRoute(1560));
    httpAdapter.get('/e2e/large', largeRoute(64 * 1024));
    await app.init();
    await app.listen(0);
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  it('prefers Brotli when the client offers it and the compressed payload is smaller', async () => {
    // supertest cannot decompress brotli, so read the body as binary and assert via headers.
    const compressed = await request(app.getHttpServer())
      .get('/e2e/large')
      .set('Accept-Encoding', 'br, gzip, deflate')
      .responseType('arraybuffer')
      .expect(200)
      .expect('Content-Encoding', 'br');
    const plain = await request(app.getHttpServer())
      .get('/e2e/large')
      .set('Accept-Encoding', 'identity')
      .expect(200);

    expect(Buffer.byteLength(compressed.body)).toBeGreaterThan(0);
    expect(Buffer.byteLength(compressed.body)).toBeLessThan(plain.body.padding.length + 12);
  });

  it('falls back to gzip when the client does not support Brotli', async () => {
    const response = await request(app.getHttpServer())
      .get('/e2e/large')
      .set('Accept-Encoding', 'gzip, deflate')
      .expect(200);

    expect(response.headers['content-encoding']).toBe('gzip');
  });

  it('sends responses just below the threshold uncompressed', async () => {
    const response = await request(app.getHttpServer())
      .get('/e2e/below-threshold')
      .set('Accept-Encoding', 'br, gzip, deflate')
      .expect(200);

    expect(response.headers['content-encoding']).toBeUndefined();
  });

  it('compresses responses just above the threshold', async () => {
    const response = await request(app.getHttpServer())
      .get('/e2e/above-threshold')
      .set('Accept-Encoding', 'br, gzip, deflate')
      .responseType('arraybuffer')
      .expect(200)
      .expect('Content-Encoding', 'br');

    expect(Buffer.byteLength(response.body)).toBeGreaterThan(0);
  });
});
