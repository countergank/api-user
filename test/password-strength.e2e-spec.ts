import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app/app.module';
import { PASSWORD_ERROR_CODES } from '../src/common/interfaces/password-validation.interface';

describe('Password Strength Validation (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/auth/register (POST) - Password Strength', () => {
    const baseUser = {
      name: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      userName: 'testuser',
      role: 'user',
    };

    it('should accept valid password', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          ...baseUser,
          email: `valid-${Date.now()}@example.com`,
          userName: `validuser-${Date.now()}`,
          password: 'SecurePass123@',
        })
        .expect(201);
    });

    it('should reject password too short', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          ...baseUser,
          email: `short-${Date.now()}@example.com`,
          userName: `shortuser-${Date.now()}`,
          password: 'Abc1@',
        })
        .expect(400);

      expect(response.body.message).toContain(PASSWORD_ERROR_CODES.MIN_LENGTH);
    });

    it('should reject password without uppercase', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          ...baseUser,
          email: `upper-${Date.now()}@example.com`,
          userName: `upperuser-${Date.now()}`,
          password: 'securepass123@',
        })
        .expect(400);

      expect(response.body.message).toContain(PASSWORD_ERROR_CODES.UPPERCASE);
    });

    it('should reject password without lowercase', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          ...baseUser,
          email: `lower-${Date.now()}@example.com`,
          userName: `loweruser-${Date.now()}`,
          password: 'SECUREPASS123@',
        })
        .expect(400);

      expect(response.body.message).toContain(PASSWORD_ERROR_CODES.LOWERCASE);
    });

    it('should reject password without number', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          ...baseUser,
          email: `number-${Date.now()}@example.com`,
          userName: `numberuser-${Date.now()}`,
          password: 'SecurePass@',
        })
        .expect(400);

      expect(response.body.message).toContain(PASSWORD_ERROR_CODES.NUMBER);
    });

    it('should reject password without special character', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          ...baseUser,
          email: `special-${Date.now()}@example.com`,
          userName: `specialuser-${Date.now()}`,
          password: 'SecurePass123',
        })
        .expect(400);

      expect(response.body.message).toContain(PASSWORD_ERROR_CODES.SPECIAL_CHAR);
    });

    it('should reject password with common sequence', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          ...baseUser,
          email: `sequence-${Date.now()}@example.com`,
          userName: `sequenceuser-${Date.now()}`,
          password: 'Secure123Pass@',
        })
        .expect(400);

      expect(response.body.message).toContain(PASSWORD_ERROR_CODES.SEQUENCE);
    });

    it('should reject password with consecutive repeated chars', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          ...baseUser,
          email: `repeat-${Date.now()}@example.com`,
          userName: `repeatuser-${Date.now()}`,
          password: 'SecurePasss1@',
        })
        .expect(400);

      expect(response.body.message).toContain(PASSWORD_ERROR_CODES.CONSECUTIVE);
    });

    it('should reject password exceeding max length', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          ...baseUser,
          email: `long-${Date.now()}@example.com`,
          userName: `longuser-${Date.now()}`,
          password: 'A'.repeat(65) + 'a'.repeat(10) + '1'.repeat(10) + '@'.repeat(10),
        })
        .expect(400);

      expect(response.body.message).toContain(PASSWORD_ERROR_CODES.MAX_LENGTH);
    });
  });

  describe('/users/change-password (POST) - Password Strength', () => {
    const testEmail = `changepass-${Date.now()}@example.com`;
    const testUserName = `changepassuser-${Date.now()}`;
    const testPassword = 'SecurePass123@';
    const newPassword = 'NewSecurePass456@';
    let token: string;

    beforeAll(async () => {
      // Create user for password change tests
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Test',
          lastName: 'User',
          email: testEmail,
          userName: testUserName,
          password: testPassword,
          role: 'user',
        })
        .expect(201);

      // Login to get token
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(200);

      token = response.body.accessToken;
    });

    it('should accept valid new password', async () => {
      await request(app.getHttpServer())
        .post('/users/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: testPassword,
          newPassword: 'AnotherPass789$',
        })
        .expect(200);
    });

    it('should reject weak new password', async () => {
      const response = await request(app.getHttpServer())
        .post('/users/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: testPassword,
          newPassword: 'weak',
        })
        .expect(400);

      expect(response.body.message).toContain(PASSWORD_ERROR_CODES.MIN_LENGTH);
    });

    it('should reject new password without uppercase', async () => {
      const response = await request(app.getHttpServer())
        .post('/users/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: testPassword,
          newPassword: 'newsecurepass123@',
        })
        .expect(400);

      expect(response.body.message).toContain(PASSWORD_ERROR_CODES.UPPERCASE);
    });
  });
});