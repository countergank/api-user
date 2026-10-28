import { InjectionToken } from '@nestjs/common';
import { MockFunctionMetadata, ModuleMocker } from 'jest-mock';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose, { Connection } from 'mongoose';

/**
 * Single place where the unit suites' Mongo is started (COU-343, S5).
 *
 * - With `MONGO_TEST_EXTERNAL=1` (set by the CI "Run unit tests" step) it reuses the
 *   replica set the workflow already starts on `DATABASE_HOST:DATABASE_PORT`, building the
 *   URI from `DATABASE_USER`/`DATABASE_PASSWORD` with `authSource=admin` and a database name
 *   unique per suite (`unit_<label>_<pid>_<counter>`) so a teardown `dropDatabase()` can
 *   never touch `api_user` or another suite's data (S2, S3). `mongod` is `null` in that case.
 * - Without it (local `npm test`, no Docker and no Mongo needed) it starts an in-memory
 *   replica set exactly as before (S1).
 */
export interface TestMongo {
  uri: string;
  mongod: MongoMemoryReplSet | null;
}

let externalDatabaseCounter = 0;

export const startTestMongo = async (label: string): Promise<TestMongo> => {
  if (process.env.MONGO_TEST_EXTERNAL === '1') {
    const host = process.env.DATABASE_HOST ?? 'localhost';
    const port = process.env.DATABASE_PORT ?? '27017';
    const user = process.env.DATABASE_USER;
    const password = process.env.DATABASE_PASSWORD;
    const credentials = user && password ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}@` : '';
    const databaseName = `unit_${label}_${process.pid}_${externalDatabaseCounter++}`;
    // `directConnection=true` pins the driver to DATABASE_HOST:DATABASE_PORT instead of
    // following replica-set discovery: CI initiates rs0 as localhost:27017, but the local
    // docker-compose replica set announces itself as db-user:27017, which does not resolve
    // from the host and would make every connection hang until server selection times out.
    return {
      uri: `mongodb://${credentials}${host}:${port}/${databaseName}?authSource=admin&directConnection=true`,
      mongod: null,
    };
  }

  const mongod = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });
  return {
    uri: mongod.getUri(),
    mongod,
  };
};

export const Mock = (token: InjectionToken) => {
  const moduleMocker = new ModuleMocker(global);
  const mockMetadata = moduleMocker.getMetadata(token) as MockFunctionMetadata<any, any>;
  const mock = moduleMocker.generateFromMetadata(mockMetadata);
  return new mock();
};

export const clearMongoConnection = async (mongoConnection: Connection, mongod?: MongoMemoryReplSet) => {
  // Wait for pending auto-index builds on every open connection (the suite's own and any
  // MongooseModule.forRoot connection opened during the test): mongoose's dropDatabase()
  // does not await them, and an index build finishing after the drop would recreate the
  // database it was building into.
  await Promise.all(
    mongoose.connections
      .filter((connection) => connection.readyState === 1)
      .flatMap((connection) => Object.values(connection.models).map((model) => model.init().catch(() => undefined))),
  );
  await mongoConnection.dropDatabase();
  await Promise.all(mongoose.connections.map((connection) => connection.close().catch(() => undefined)));
  if (mongod) {
    await mongod.stop();
  }
};

export const clearMongoCollection = async (mongoConnection: Connection) => {
  const collections = mongoConnection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
};

export const createConnection = async (label: string) => {
  const { uri, mongod } = await startTestMongo(label);
  const mongoConnection = await mongoose.createConnection(uri).asPromise();
  return {
    uri,
    mongod,
    mongoConnection,
  };
};
