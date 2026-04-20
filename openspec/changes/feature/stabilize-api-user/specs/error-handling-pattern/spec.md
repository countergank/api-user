# error-handling-pattern Specification

## Overview

Sistema centralizado de manejo de errores usando error catalog pattern.

## Requirements

### F01 - ErrorBase Class
- Clase base para todos los errores customizados
- Propiedades: code, message, httpStatus, metadata
- Método toJSON() para serialización

### F02 - Error Catalog
- Diccionario de errores centralizado en constants
- Cada error con code único, mensaje template, HttpStatus
- Soporte para metadata/variables en mensajes

### F03 - Error Filter
- Global exception filter que captura ErrorBase
- Respuesta JSON estandarizada
- Logging de errores

### F04 - Error Instances
- Errores predefinidos como clases instanciables
- Ejemplos: UserNotFoundError, ValidationError, UnauthorizedError

## Acceptance Criteria

- [ ] ErrorBase implementado
- [ ] Error catalog con al menos 5 errores definidos
- [ ] ErrorFilter global configurado
- [ ] Errores usados en controllers/services