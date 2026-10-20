// Jest setup - load environment variables for e2e tests.
//
// The resolution lives in test/helpers/test-env.js because jest globalSetup runs
// before setupFiles: both entry points must agree on the target database.
const { loadTestEnv } = require('./helpers/test-env');

const loadedEnvFile = loadTestEnv();
console.log('Loaded env from:', loadedEnvFile ?? 'built-in defaults (no .env.local.testing found)');
