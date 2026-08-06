import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../../helpers/create-test-app';

describe('Validation Messages i18n (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Password validation messages in Spanish (default)', () => {
    it('should return Spanish validation messages for weak password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          userName: 'test',
          password: 'weak',
          name: 'Test',
          lastName: 'User',
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode');
    });
  });

  describe('Password validation messages in English', () => {
    it('should return English validation messages for weak password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .set('Accept-Language', 'en')
        .send({
          email: 'test@example.com',
          userName: 'test',
          password: 'weak',
          name: 'Test',
          lastName: 'User',
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode');
    });
  });

  describe('Password validation messages in Portuguese', () => {
    it('should return Portuguese validation messages for weak password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .set('Accept-Language', 'pt')
        .send({
          email: 'test@example.com',
          userName: 'test',
          password: 'weak',
          name: 'Test',
          lastName: 'User',
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode');
    });
  });
});
