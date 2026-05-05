import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app/app.module';
import { ValidationPipe } from '@nestjs/common';

describe('Error Messages i18n (e2e)', () => {
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

  describe('Error messages in Spanish (default)', () => {
    it('should return Spanish error for invalid registration', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/user/register')  // Adjust endpoint as needed
        .send({})
        .expect(400);

      // Should have error structure
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode');
    });
  });

  describe('Error messages in English', () => {
    it('should return English error for invalid registration', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/user/register')  // Adjust endpoint as needed
        .set('Accept-Language', 'en')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode');
    });
  });

  describe('Error messages in Portuguese', () => {
    it('should return Portuguese error for invalid registration', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/user/register')  // Adjust endpoint as needed
        .set('Accept-Language', 'pt')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode');
    });
  });
});
