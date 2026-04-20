# api-documentation Specification

## Overview

Documentación automática de API usando Swagger/OpenAPI.

## Requirements

### F01 - Swagger Setup
- Instalación de @nestjs/swagger
- DocumentBuilder configurado en main.ts
- Título, descripción, versión de API

### F02 - DTOs Documentation
- Decoradores ApiProperty en todos los DTOs
- Descripciones de endpoints con ApiOperation
- Response types con ApiResponse

### F03 - Controller Documentation
- Tags por módulo/feature
- Documentación de parámetros
- Auth endpoints con Bearer

### F04 - OpenAPI Endpoint
- Acceso a documentación en /docs
- JSON schema en /docs-json

## Acceptance Criteria

- [ ] Swagger configurado en main.ts
- [ ] Todos los DTOs con decorators de swagger
- [ ] Endpoints documentados
- [ ] /docs accesible