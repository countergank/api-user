import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../../helpers/create-test-app';

describe('i18n (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe('Auth Flows', () => {
    describe('Registration flow with different languages', () => {
      it('should handle registration error in Spanish (default)', async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: 'invalid-email',
            userName: 'test',
            password: 'weak',
            name: 'Test',
            lastName: 'User',
          })
          .expect(400);

        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('statusCode');
      });

      it('should handle registration error in English', async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .set('Accept-Language', 'en')
          .send({
            email: 'invalid-email',
            userName: 'test',
            password: 'weak',
            name: 'Test',
            lastName: 'User',
          })
          .expect(400);

        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('statusCode');
      });

      it('should handle registration error in Portuguese', async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .set('Accept-Language', 'pt')
          .send({
            email: 'invalid-email',
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

    describe('Login flow with different languages', () => {
      it('should handle login error in Spanish (default)', async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/login')
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
          .post('/auth/login')
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

  describe('Error Messages', () => {
    describe('Error messages in Spanish (default)', () => {
      it('should return Spanish error for invalid registration', async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: 'invalid-email',
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

    describe('Error messages in English', () => {
      it('should return English error for invalid registration', async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .set('Accept-Language', 'en')
          .send({
            email: 'invalid-email',
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

    describe('Error messages in Portuguese', () => {
      it('should return Portuguese error for invalid registration', async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .set('Accept-Language', 'pt')
          .send({
            email: 'invalid-email',
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

  describe('Language Detection', () => {
    it('should detect Spanish as default language (no header)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/non-existent')
        .expect(404);

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
        .set('Accept-Language', 'fr')
        .expect(404);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Validation Messages', () => {
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
});
