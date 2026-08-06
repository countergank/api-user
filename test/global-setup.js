const { MongoClient } = require('mongodb');
const Redis = require('ioredis');

// globalSetup runs BEFORE setupFiles, so jest.setup.ts env vars aren't available yet.
// Use the docker-compose MongoDB defaults (no auth on local dev).
const MONGO_URI = 'mongodb://dev_user:dev_password@localhost:27017/api_user?directConnection=true&authSource=admin';

const DEFAULT_PERMISSIONS = [
  { name: 'user:create', description: 'Create users', category: 'user' },
  { name: 'user:read', description: 'Read users', category: 'user' },
  { name: 'user:update', description: 'Update users', category: 'user' },
  { name: 'user:delete', description: 'Delete users', category: 'user' },
  { name: 'role:create', description: 'Create roles', category: 'system' },
  { name: 'role:read', description: 'Read roles', category: 'system' },
  { name: 'role:update', description: 'Update roles', category: 'system' },
  { name: 'role:delete', description: 'Delete roles', category: 'system' },
  { name: 'permission:create', description: 'Create permissions', category: 'system' },
  { name: 'permission:read', description: 'Read permissions', category: 'system' },
  { name: 'permission:update', description: 'Update permissions', category: 'system' },
  { name: 'permission:delete', description: 'Delete permissions', category: 'system' },
];

const DEFAULT_ROLES = [
  { name: 'admin', description: 'Administrator with full access', permissionIds: ['*'], isSystem: true, isDefault: false },
  { name: 'user', description: 'Standard user with basic permissions', permissionIds: ['user:read', 'user:update'], isSystem: true, isDefault: true },
  { name: 'viewer', description: 'Read-only user', permissionIds: ['user:read'], isSystem: true, isDefault: false },
];

module.exports = async function () {
  // Flush Redis cache so stale cached data from previous runs doesn't mask
  // freshly seeded DB state (e.g. empty permissions/roles arrays cached by a
  // prior e2e run).
  const redis = new Redis({ host: 'localhost', port: 6379, maxRetriesPerRequest: 1 });
  try {
    await redis.flushall();
    console.log('[global-setup] Redis cache flushed');
  } catch (err) {
    console.log('[global-setup] Redis flush skipped (not critical):', err.message);
  } finally {
    redis.disconnect();
  }

  const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 10000 });

  try {
    await client.connect();
    const db = client.db();

    const permCount = await db.collection('permissions').countDocuments();
    if (permCount === 0) {
      await db.collection('permissions').insertMany(DEFAULT_PERMISSIONS);
      console.log(`[global-setup] Seeded ${DEFAULT_PERMISSIONS.length} default permissions`);
    }

    const roleCount = await db.collection('roles').countDocuments();
    if (roleCount === 0) {
      await db.collection('roles').insertMany(DEFAULT_ROLES);
      console.log(`[global-setup] Seeded ${DEFAULT_ROLES.length} default roles`);
    }
  } catch (err) {
    console.error('[global-setup] Failed to seed DB:', err.message);
    throw err;
  } finally {
    await client.close();
  }
};
