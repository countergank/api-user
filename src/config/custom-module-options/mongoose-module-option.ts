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
    const uri = `mongodb://${user}:${password}@${host}:${port}/${database}`;
    return {
      uri: uri,
    };
  }
}
