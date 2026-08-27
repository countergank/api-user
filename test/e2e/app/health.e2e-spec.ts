import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../../helpers/create-test-app';

describe('Health Check (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('should return 200 with status ok when healthy (HLTH-01)', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
    });

    it('should include database and redis details (HLTH-02)', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body.details).toBeDefined();
      expect(response.body.details.database).toBeDefined();
      expect(response.body.details.redis).toBeDefined();
    });

    it('should not require authentication (public endpoint)', async () => {
      // No Authorization header — should still return 200
      await request(app.getHttpServer())
        .get('/health')
        .expect(200);
    });

    it('should return application/json content type (HLTH-01)', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });
});
