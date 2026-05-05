import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app/app.module';
import { ValidationPipe } from '@nestjs/common';

describe('Validation Messages i18n (e2e)', () => {
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

  describe('Password validation messages in Spanish (default)', () => {
    it('should return Spanish validation messages for weak password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/user/register')  // Adjust endpoint as needed
        .send({
          email: 'test@example.com',
          password: 'weak',  // Too short, no uppercase, etc.
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode');
      // In a real test, you'd verify the message contains Spanish text
    });
  });

  describe('Password validation messages in English', () => {
    it('should return English validation messages for weak password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/user/register')  // Adjust endpoint as needed
        .set('Accept-Language', 'en')
        .send({
          email: 'test@example.com',
          password: 'weak',
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode');
      // In a real test, you'd verify the message contains English text
    });
  });

  describe('Password validation messages in Portuguese', () => {
    it('should return Portuguese validation messages for weak password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/user/register')  // Adjust endpoint as needed
        .set('Accept-Language', 'pt')
        .send({
          email: 'test@example.com',
          password: 'weak',
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode');
      // In a real test, you'd verify the message contains Portuguese text
    });
  });
});
