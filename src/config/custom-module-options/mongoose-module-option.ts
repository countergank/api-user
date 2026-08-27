import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModuleOptions, MongooseOptionsFactory } from '@nestjs/mongoose';

@Injectable()
export class MongooseModuleOption implements MongooseOptionsFactory {
  constructor(private readonly configService: ConfigService) {}

  createMongooseOptions(): MongooseModuleOptions {
    const user = this.configService.getOrThrow('DATABASE_USER');
    const password = this.configService.getOrThrow('DATABASE_PASSWORD');
    const host = this.configService.getOrThrow('DATABASE_HOST');
    const port = this.configService.getOrThrow('DATABASE_PORT');
    const database = this.configService.getOrThrow('DATABASE_NAME');
    const replicaSet = this.configService.get<string>('DATABASE_REPLICA_SET', 'rs0');

    // When connecting from outside the docker network (e.g. e2e tests from the
    // host), the replica set member is registered as the docker hostname
    // (db-user:27017). The driver discovers it and fails with EAI_AGAIN. Use
    // directConnection to skip replica set topology discovery.
    const directConnection = process.env.JEST_WORKER_ID !== undefined;

    const queryParams = directConnection
      ? 'authSource=admin&directConnection=true'
      : `authSource=admin&replicaSet=${replicaSet}`;
    const uri = `mongodb://${user}:${password}@${host}:${port}/${database}?${queryParams}`;
    return {
      uri: uri,
    };
  }
}
