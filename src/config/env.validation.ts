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
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsString()
  VERSION: string;

  @IsString()
  DATABASE_USER: string;

  @IsString()
  DATABASE_PASSWORD: string;

  @IsString()
  DATABASE_HOST: string;

  @IsString()
  DATABASE_PORT: string;

  @IsString()
  @IsNotEmpty()
  DATABASE_NAME: string;

  @IsString()
  HOST: string;

  @IsString()
  PORT: string;

  @IsString()
  @IsNotEmpty()
  ENCRYPTION_PASSWORD: string;

  @IsString()
  @IsOptional()
  DEBUG: string;
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
