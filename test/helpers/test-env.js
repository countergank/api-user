// Shared e2e environment resolution.
//
// jest globalSetup runs BEFORE setupFiles, so the seeder in test/global-setup.js
// cannot rely on test/jest.setup.ts having populated process.env yet. Both entry
// points therefore resolve the environment through this module, which keeps the
// database the setup seeds and the database the application under test uses in
// agreement by construction.
//
// Precedence (identical to the previous inline logic in test/jest.setup.ts):
//   1. CI-safe defaults below, applied only when the variable is unset.
//   2. An optional `.env.local.testing` file (gitignored, developer machines
//      only) overrides any value, so local runs hit the isolated database.
const fs = require('node:fs');
const path = require('node:path');

const ENV_FILES = [
  path.resolve(__dirname, '../.env.local.testing'),
  path.resolve(__dirname, '../../.env.local.testing'),
];

const DEFAULT_ENV = {
  NODE_ENV: 'local',
  VERSION: '1.0.0',
  DATABASE_USER: 'dev_user',
  DATABASE_PASSWORD: 'dev_password',
  DATABASE_HOST: 'localhost',
  DATABASE_PORT: '27017',
  DATABASE_NAME: 'api_user',
  JWT_SECRET: 'test-jwt-secret-key-for-testing',
  ENCRYPTION_PASSWORD: 'test_encryption_password_32chars!',
  CORS_ORIGINS: 'http://localhost:3000',
  DEBUG: 'false',
  LOG_LEVEL: 'silent',
  EXAMPLE_MICROSERVICE_ENABLED: 'false',

  // Rate limiting — elevated limits for parallel e2e testing
  LOGIN_THROTTLE_LIMIT: '20',
  LOGIN_THROTTLE_TTL: '60',
  REGISTER_THROTTLE_LIMIT: '30',
  REGISTER_THROTTLE_TTL: '60',
  THROTTLE_LIMIT: '30',
  THROTTLE_TTL: '60',
  FORGOT_PASSWORD_THROTTLE_LIMIT: '15',
  FORGOT_PASSWORD_THROTTLE_TTL: '60',

  // Account lockout — low threshold for testing
  MAX_LOGIN_ATTEMPTS: '3',
  LOCKOUT_DURATION_MINUTES: '1',
};

/**
 * Populates process.env with the e2e defaults plus any `.env.local.testing`
 * overrides.
 *
 * @returns {string | null} absolute path of the env file that was applied, or
 *   null when only the built-in defaults were used.
 */
function loadTestEnv() {
  for (const [key, value] of Object.entries(DEFAULT_ENV)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }

  const envPath = ENV_FILES.find((candidate) => fs.existsSync(candidate));
  if (!envPath) {
    return null;
  }

  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...valueParts] = trimmed.split('=');
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  }

  return envPath;
}

/**
 * Builds the MongoDB URI the e2e runner must use, mirroring
 * src/config/custom-module-options/mongoose-module-option.ts.
 *
 * Under Jest the app connects from the host, so `directConnection=true` skips
 * replica set discovery (the replica member is registered as `db-user:27017`).
 */
function getTestMongoUri() {
  const user = process.env.DATABASE_USER;
  const password = process.env.DATABASE_PASSWORD;
  const host = process.env.DATABASE_HOST;
  const port = process.env.DATABASE_PORT;
  const database = process.env.DATABASE_NAME;

  return `mongodb://${user}:${password}@${host}:${port}/${database}?authSource=admin&directConnection=true`;
}

module.exports = { loadTestEnv, getTestMongoUri, DEFAULT_ENV, ENV_FILES };
