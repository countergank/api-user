import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTemplateRequest {
  @ApiProperty({ example: 'Welcome Email', description: 'Nombre legible del template' })
  name: string;

  @ApiProperty({ example: 'welcome', description: 'Identificador único en kebab-case' })
  slug: string;

  @ApiProperty({ example: 'Bienvenido {{userName}}!', description: 'Asunto con variables' })
  subject: string;

  @ApiProperty({ example: '<h1>Hola {{userName}}</h1>', description: 'Contenido HTML con variables' })
  content: string;

  @ApiPropertyOptional({
    example: ['userName', 'verificationLink'],
    description: 'Lista de variables usadas',
  })
  variables?: string[];

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/logo.png',
    description: 'URL pública de imagen',
  })
  imageUrl?: string;
}

export class TemplateResponse {
  @ApiProperty({ example: 'abc123' })
  id: string;

  @ApiProperty({ example: 'Welcome Email' })
  name: string;

  @ApiProperty({ example: 'welcome' })
  slug: string;

  @ApiProperty({ example: 'Bienvenido {{userName}}!' })
  subject: string;

  @ApiProperty({ example: '<h1>Hola {{userName}}</h1>' })
  content: string;

  @ApiProperty({ example: ['userName', 'verificationLink'] })
  variables: string[];

  @ApiPropertyOptional({ example: 'https://cdn.example.com/logo.png' })
  imageUrl?: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: 1 })
  version: number;

  @ApiProperty({ example: '2026-04-30T00:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-04-30T00:00:00.000Z' })
  updatedAt: string;
}

export class TemplateListResponse {
  @ApiProperty({ type: [TemplateResponse] })
  templates: TemplateResponse[];
}

export class UpdateTemplateRequest {
  @ApiPropertyOptional({ example: 'Welcome Email Updated' })
  name?: string;

  @ApiPropertyOptional({ example: '<h1>Hola {{userName}}!</h1>' })
  content?: string;

  @ApiPropertyOptional({ example: 'Bienvenido a Countergank, {{userName}}!' })
  subject?: string;

  @ApiPropertyOptional({ example: ['userName', 'verificationLink', 'promoCode'] })
  variables?: string[];

  @ApiPropertyOptional({ example: 'https://cdn.example.com/new-logo.png' })
  imageUrl?: string;

  @ApiPropertyOptional({ example: false })
  isActive?: boolean;
}
