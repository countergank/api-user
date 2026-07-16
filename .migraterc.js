require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

const user = process.env.DATABASE_USER || 'dev_user';
const password = process.env.DATABASE_PASSWORD || 'dev_password';
const host = process.env.DATABASE_HOST || 'localhost';
const port = process.env.DATABASE_PORT || '27017';
const name = process.env.DATABASE_NAME || 'api_user';

// directConnection=true is needed because replica set topology advertises
// db-user:27017 which doesn't resolve from the host (only inside Docker network)
const uriBase = process.env.MONGODB_MIGRATE_URI ||
  `mongodb://${user}:${password}@${host}:${port}/${name}?authSource=admin`;
const uri = uriBase.includes('?')
  ? `${uriBase}&directConnection=true`
  : `${uriBase}?directConnection=true`;

module.exports = {
  mongodb: {
    url: uri,
    databaseName: name,
    options: {},
  },
  migrationsDir: 'migrations',
  changelogCollectionName: 'migrations_changelog',
};