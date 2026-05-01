import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/create-test-app';
import { PASSWORD_ERROR_CODES } from '../src/common/interfaces/password-validation.interface';

/**
 * Helper to check if any error message contains the expected code.
 * ValidationPipe returns `message` as an array of strings.
 */
function hasErrorCode(message: string | string[], code: string): boolean {
  if (Array.isArray(message)) {
    return message.some((m) => m.includes(code));
  }
  return message.includes(code);
}

describe('Password Strength Validation (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/auth/register (POST) - Password Strength', () => {
    const baseUser = {
      name: 'Test',
      lastName: 'User',
    };

    it('should accept valid password', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          ...baseUser,
          email: `valid-${Date.now()}@example.com`,
          userName: `validuser-${Date.now()}`,
          password: 'V@lidP4sw0rdXz',
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

      expect(hasErrorCode(response.body.message, PASSWORD_ERROR_CODES.MIN_LENGTH)).toBe(true);
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

      expect(hasErrorCode(response.body.message, PASSWORD_ERROR_CODES.UPPERCASE)).toBe(true);
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

      expect(hasErrorCode(response.body.message, PASSWORD_ERROR_CODES.LOWERCASE)).toBe(true);
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

      expect(hasErrorCode(response.body.message, PASSWORD_ERROR_CODES.NUMBER)).toBe(true);
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

      expect(hasErrorCode(response.body.message, PASSWORD_ERROR_CODES.SPECIAL_CHAR)).toBe(true);
    });

    it('should reject password with common sequence', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          ...baseUser,
          email: `sequence-${Date.now()}@example.com`,
          userName: `sequenceuser-${Date.now()}`,
          password: 'AbcXy9!k',
        })
        .expect(400);

      expect(hasErrorCode(response.body.message, PASSWORD_ERROR_CODES.SEQUENCE)).toBe(true);
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

      expect(hasErrorCode(response.body.message, PASSWORD_ERROR_CODES.CONSECUTIVE)).toBe(true);
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

      expect(hasErrorCode(response.body.message, PASSWORD_ERROR_CODES.MAX_LENGTH)).toBe(true);
    });
  });

  describe('/users/change-password (POST) - Password Strength', () => {
    const testEmail = `changepass-${Date.now()}@example.com`;
    const testUserName = `changepassuser-${Date.now()}`;
    const testPassword = 'V@lidP4sw0rdXz';
    let token: string;

    beforeAll(async () => {
      const registerRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'Test',
          lastName: 'User',
          email: testEmail,
          userName: testUserName,
          password: testPassword,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token: registerRes.body.verificationToken })
        .expect(201);

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(200);

      token = loginRes.body.accessToken;
    });

    it('should accept valid new password', async () => {
      await request(app.getHttpServer())
        .post('/users/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: testPassword,
          newPassword: 'An0th3r$ecur3Y',
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

      expect(hasErrorCode(response.body.message, PASSWORD_ERROR_CODES.MIN_LENGTH)).toBe(true);
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

      expect(hasErrorCode(response.body.message, PASSWORD_ERROR_CODES.UPPERCASE)).toBe(true);
    });
  });
});
