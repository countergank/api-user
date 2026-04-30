import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsArray, IsUrl, Matches } from 'class-validator';

/**
 * DTO para actualización parcial de templates.
 */
export class UpdateTemplateDto {
  @ApiPropertyOptional({ example: 'Welcome Email Updated' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'welcome-v2' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'slug must be kebab-case lowercase (e.g., password-reset)',
  })
  slug?: string;

  @ApiPropertyOptional({ example: 'Bienvenido {{userName}}!' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ example: '<h1>Hola {{userName}}</h1>' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ example: ['userName', 'verificationLink'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @ApiPropertyOptional({ example: 'https://cdn.example.com/logo.png' })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  isActive?: boolean;
}
