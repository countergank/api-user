# nestjs-best-practices Specification

## Overview

Skill de OpenCode con mejores prácticas de desarrollo senior para NestJS.

## Requirements

### F01 - Arquitectura Hexagonal
- Estructura por feature (no por tipo)
- Repository pattern para abstracción de datos
- Module organization siguiendo Screaming Architecture

### F02 - Error Handling
- Error catalog pattern con errores tipados
- Error filters global para manejo centralizado
- Tipado de errores con HttpStatus apropiados

### F03 - Testing Patterns
- Unit tests para servicios
- Controller tests con mocks
- Repository tests para validación de queries

### F04 - Performance
- Redis caching con cache-manager
- Rate limiting con @nestjs/throttler
- Query optimization (projections, lean())

### F05 - Security
- JWT authentication con Passport
- RBAC con roles decorators
- Input sanitization

### F06 - Observability
- Prometheus metrics
- OpenTelemetry tracing
- Health checks endpoint

### F07 - API Design
- Pagination con metadata
- Filtering & search
- API versioning
- Response wrapper interceptor

## Acceptance Criteria

- [ ] Skill carga automáticamente cuando contexto es NestJS
- [ ] Includes todas las secciones mencionadas
- [ ] Referencias a código existente del proyecto
- [ ]大明Examples funcionales para cada patrón