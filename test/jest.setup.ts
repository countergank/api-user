// Jest setup - load environment variables for e2e tests
const fs = require('node:fs');
const path = require('node:path');

// Set required env vars with defaults
process.env.NODE_ENV = 'local';
process.env.VERSION = '1.0.0';
process.env.DATABASE_USER = 'root';
process.env.DATABASE_PASSWORD = '';
process.env.DATABASE_HOST = 'localhost';
process.env.DATABASE_PORT = '27017';
process.env.DATABASE_NAME = 'api_user';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.ENCRYPTION_PASSWORD = 'test_encryption_password_32chars!';
process.env.CORS_ORIGINS = 'http://localhost:3000';
process.env.DEBUG = 'false';
process.env.LOG_LEVEL = 'silent';
process.env.EXAMPLE_MICROSERVICE_ENABLED = 'false';

// Rate limiting — low limits for integration testing
process.env.LOGIN_THROTTLE_LIMIT = '3';
process.env.LOGIN_THROTTLE_TTL = '60';
process.env.REGISTER_THROTTLE_LIMIT = '3';
process.env.REGISTER_THROTTLE_TTL = '60';
process.env.THROTTLE_LIMIT = '5';
process.env.THROTTLE_TTL = '60';
process.env.FORGOT_PASSWORD_THROTTLE_LIMIT = '3';
process.env.FORGOT_PASSWORD_THROTTLE_TTL = '60';

// Account lockout — low threshold for testing
process.env.MAX_LOGIN_ATTEMPTS = '3';
process.env.LOCKOUT_DURATION_MINUTES = '1';

// Try to load from .env file if available
const possibleEnvFiles = [
  path.resolve(__dirname, '.env.local.testing'),
  path.resolve(__dirname, '../.env.local.testing'),
];

for (const envPath of possibleEnvFiles) {
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=');
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
    console.log('Loaded env from:', envPath);
    break;
  }
}