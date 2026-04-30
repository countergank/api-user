import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsArray, IsOptional, IsUrl, Matches } from 'class-validator';

/**
 * DTO para creación de templates de email.
 * @example
 * {
 *   name: "Welcome Email",
 *   slug: "welcome",
 *   subject: "Bienvenido {{userName}}!",
 *   content: "<h1>Hola {{userName}}</h1><p>Verifica tu cuenta...</p>",
 *   variables: ["userName", "verificationLink"],
 *   imageUrl: "https://cdn.example.com/welcome.png"
 * }
 */
export class CreateTemplateDto {
  @ApiProperty({ example: 'Welcome Email', description: 'Nombre legible del template' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'welcome', description: 'Identificador único en kebab-case' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'slug must be kebab-case lowercase (e.g., password-reset)',
  })
  slug: string;

  @ApiProperty({
    example: 'Bienvenido {{userName}}!',
    description: 'Asunto del email (soporta variables {{var}})',
  })
  @IsNotEmpty()
  @IsString()
  subject: string;

  @ApiProperty({
    example: '<h1>Hola {{userName}}</h1>',
    description: 'Contenido HTML del email (soporta variables {{var}})',
  })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiPropertyOptional({
    example: ['userName', 'verificationLink'],
    description: 'Lista de variables usadas en el template',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/logo.png',
    description: 'URL pública de imagen para el template',
  })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;
}
