import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString, validateSync } from 'class-validator';

enum Environment {
  LOCAL = 'local',
  DEVELOPMENT = 'development',
  TEST = 'test',
  QA = 'qa',
  PRODUCTION = 'production',
}

class EnvironmentVariables {
  @IsString()
  @IsOptional()
  HOST: string;

  @IsString()
  @IsOptional()
  PORT: string;

  @IsString()
  @IsOptional()
  DEBUG: string;

  @IsEnum(Environment)
  @IsNotEmpty()
  NODE_ENV: Environment;

  @IsString()
  @IsNotEmpty()
  VERSION: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_USER: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_PASSWORD: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_HOST: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_PORT: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_NAME: string;

  @IsString()
  @IsNotEmpty()
  ENCRYPTION_PASSWORD: string;

  @IsString()
  @IsOptional()
  EXAMPLE_MICROSERVICE_HOST: string;

  @IsString()
  @IsOptional()
  EXAMPLE_MICROSERVICE_PORT: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
