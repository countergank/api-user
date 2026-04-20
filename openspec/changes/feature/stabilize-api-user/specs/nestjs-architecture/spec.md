# nestjs-architecture Specification

## Overview

Reestructuración del proyecto según hexagonal/screaming architecture con organización por feature.

## Requirements

### F01 - Estructura por Feature
- Módulos organizados por funcionalidad, no por tipo
- Cada feature tiene: controller, service, repository, dto, errors, mocks, entities
- Módulos共享 en `src/common/` para utilidades reusable

### F02 - Repository Pattern
- Abstracción de acceso a datos en repository classes
- Interfaces definidas en el módulo, implementaciones separadas
- Métodos: findById, findAll, create, update, delete

### F03 - Module Configuration
- Módulos usando `@nestjs/common` correctamente
- Imports/exports configurados para evitar dependencias circulares
- Providers scopes apropiados

## Acceptance Criteria

- [ ] Estructura reorganizada por feature
- [ ] Repository pattern implementado en user module
- [ ] Módulos bien configurados con imports/exports
- [ ] Tests adaptados a nueva estructura