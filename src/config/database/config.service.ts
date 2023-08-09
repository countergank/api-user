import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { DataSourceOptions, DatabaseType } from 'typeorm';
import { isProd, isTest } from '../../common/utils';

@Injectable()
export class TypeOrmConfigService implements TypeOrmOptionsFactory {
  constructor(private readonly config: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    return {
      type: this.config.getOrThrow<DatabaseType>('DATABASE_TYPE'),
      host: this.config.getOrThrow('DATABASE_HOST'),
      port: this.config.getOrThrow<number>('DATABASE_PORT'),
      username: this.config.getOrThrow('DATABASE_USER'),
      password: this.config.getOrThrow('DATABASE_PASSWORD'),
      database: this.config.getOrThrow('DATABASE_NAME'),
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: isProd() ? false : true,
      dropSchema: isTest(),
      autoLoadEntities: true,
      logging: this.config.get('DEBUG', false),
      retryAttempts: 3,
    } as DataSourceOptions;
  }
}
