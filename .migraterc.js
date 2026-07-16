require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

const user = process.env.DATABASE_USER || 'dev_user';
const password = process.env.DATABASE_PASSWORD || 'dev_password';
const host = process.env.DATABASE_HOST || 'localhost';
const port = process.env.DATABASE_PORT || '27017';
const name = process.env.DATABASE_NAME || 'api_user';

module.exports = {
  mongodb: {
    url: `mongodb://${user}:${password}@${host}:${port}/${name}?authSource=admin`,
    databaseName: name,
    options: {},
  },
  migrationsDir: 'migrations',
  changelogCollectionName: 'migrations_changelog',
};
