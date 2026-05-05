import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app/app.module';
import { ValidationPipe } from '@nestjs/common';

describe('Auth Flows i18n (e2e)', () => {
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

  describe('Registration flow with different languages', () => {
    it('should handle registration in Spanish (default)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/user/register')  // Adjust endpoint as needed
        .send({
          // Send invalid data to trigger validation
          email: 'invalid-email',
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode');
      // In a real test, you'd verify the message is in Spanish
    });

    it('should handle registration in English', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/user/register')  // Adjust endpoint as needed
        .set('Accept-Language', 'en')
        .send({
          email: 'invalid-email',
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode');
      // In a real test, you'd verify the message is in English
    });

    it('should handle registration in Portuguese', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/user/register')  // Adjust endpoint as needed
        .set('Accept-Language', 'pt')
        .send({
          email: 'invalid-email',
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode');
      // In a real test, you'd verify the message is in Portuguese
    });
  });

  describe('Login flow with different languages', () => {
    it('should handle login error in Spanish (default)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')  // Adjust endpoint as needed
        .send({
          email: 'nonexistent@test.com',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode');
    });

    it('should handle login error in English', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')  // Adjust endpoint as needed
        .set('Accept-Language', 'en')
        .send({
          email: 'nonexistent@test.com',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode');
    });
  });
});
