# config-validation Specification

## Overview

Validación de configuración de ambiente usando class-validator.

## Requirements

### F01 - Environment Variables Class
- Clase con decorators de class-validator
- Tipado estricto para cada variable
- Valores por defecto apropiados

### F02 - Validation Function
- Función que valida config contra schema
- Uso de plainToInstance de class-transformer
- Manejo de errores de validación

### F03 - Config Module Integration
- Integración con ConfigModule de NestJS
- Carga desde .env con validación

### F04 - Secrets Management
- Variables sensibles no hardcodeadas
- Documentación de variables requeridas

## Acceptance Criteria

- [ ] EnvironmentVariables class definida
- [ ] Función de validación implementada
- [ ] Integración con ConfigModule
- [ ] Documentación de variables de entorno