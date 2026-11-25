import { INestApplication } from '@nestjs/common';
import { createTestApp } from '../../helpers/create-test-app';
import { CacheService } from '../../../src/config/cache';

describe('Cache Warm-up (e2e)', () => {
  let app: INestApplication;
  let cache: CacheService;

  beforeAll(async () => {
    app = await createTestApp();
    cache = app.get(CacheService);
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  }, 10000);

  it('warms the RBAC permission list at startup, before any request', async () => {
    expect(await cache.get('rbac:permissions:all')).toBeDefined();
  });

  it('warms the RBAC role list at startup, before any request', async () => {
    expect(await cache.get('rbac:roles:all')).toBeDefined();
  });

  it('warms the seeded email templates at startup, before any request', async () => {
    expect(await cache.get('cache:email-template:welcome')).toBeDefined();
  });
});
