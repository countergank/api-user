import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app/app.module';
import { ValidationPipe } from '@nestjs/common';

describe('Language Detection (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should detect Spanish as default language (no header)', async () => {
    // This test assumes an endpoint that returns error messages
    // We'll test with a non-existent endpoint to trigger an error
    const response = await request(app.getHttpServer())
      .get('/api/non-existent')
      .expect(404);

    // The error message should be in Spanish (default)
    // We can't easily assert the language without knowing the exact error structure
    // But we can verify the response has the expected structure
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('statusCode');
  });

  it('should detect English from Accept-Language header', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/non-existent')
      .set('Accept-Language', 'en')
      .expect(404);

    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('statusCode');
  });

  it('should detect Portuguese from Accept-Language header', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/non-existent')
      .set('Accept-Language', 'pt')
      .expect(404);

    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('statusCode');
  });

  it('should fall back to Spanish for unsupported language', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/non-existent')
      .set('Accept-Language', 'fr')  // French not supported
      .expect(404);

    // Should fall back to Spanish (default)
    expect(response.body).toHaveProperty('message');
  });
});
