import { InjectionToken } from '@nestjs/common';
import { MockFunctionMetadata, ModuleMocker } from 'jest-mock';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { Connection } from 'mongoose';

export const Mock = (token: InjectionToken) => {
  const moduleMocker = new ModuleMocker(global);
  const mockMetadata = moduleMocker.getMetadata(token) as MockFunctionMetadata<any, any>;
  const mock = moduleMocker.generateFromMetadata(mockMetadata);
  return new mock();
};

export const clearMongoConnection = async (mongoConnection: Connection, mongod: MongoMemoryServer) => {
  await mongoConnection.dropDatabase();
  await mongoConnection.close();
  await mongod.stop();
};

export const clearMongoCollection = async (mongoConnection: Connection) => {
  const collections = mongoConnection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
};

export const createConnection = async () => {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  const mongoConnection = mongoose.createConnection(uri);
  return {
    mongod,
    mongoConnection,
  };
};
