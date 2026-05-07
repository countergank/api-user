# Proposal: Internacionalización (i18n) para API User

## Intent

Agregar soporte de internacionalización (i18n) a la API para soportar múltiples idiomas (español, inglés y portugués) en:
- Mensajes de error
- Validaciones
- Plantillas de email
- Respuestas de la API

Actualmente toda la API está en español hardcodeado, lo que limita su adopción en contextos internacionales.

**Idiomas soportados iniciales**: `es` (Español), `en` (English), `pt` (Português)

## Scope

### In Scope
- Detección de idioma via header `Accept-Language`
- Traducción de mensajes de error (common y user modules) en es/en/pt
- Traducción de mensajes de validación (class-validator) en es/en/pt
- Plantillas de email multilingües (es/en/pt)
- Middleware/interceptor de detección de idioma
- Servicio de i18n centralizado
- **Testing funcional**: Verificar detección de idioma y respuestas correctas
- **Testing e2e**: Flujos completos con diferentes idiomas (register, login, error responses)

### Out of Scope
- Traducción de logs del sistema
- Base de datos multilingüe
- Mas idiomas más allá de español/inglés/portugués (preparado para escalar)
- Localización de fechas/monedas (solo strings)

## Capabilities

### New Capabilities
- `i18n-core`: Servicio central de internacionalización y detección de idioma (es/en/pt)
- `i18n-error-messages`: Traducción de mensajes de error (es/en/pt)
- `i18n-email-templates`: Plantillas de email multilingües (es/en/pt)
- `i18n-validation`: Mensajes de validación en múltiples idiomas (es/en/pt)
- `i18n-testing`: Tests funcionales y e2e para verificar i18n

### Modified Capabilities
- `error-handling`: Modificación para soportar mensajes multilingües

## Approach

**Basado en el patrón existente**: El proyecto ya tiene un patrón bilingüe en `PASSWORD_MESSAGES` (`src/common/interfaces/password-validation.interface.ts`) que usa la estructura `{ es: '...', en: '...' }`.

**Estrategia**:
1. Usar **nestjs-i18n** como librería estándar (se integra nativamente con NestJS)
2. Seguir el patrón `{ es: '...', en: '...', pt: '...' }` ya establecido (extender PASSWORD_MESSAGES)
3. Middleware que lea `Accept-Language` y establezca el idioma en el contexto de la request
4. Servicio `I18nService` que centralice la resolución de traducciones
5. Refactorizar `error.dictionary.ts` para usar claves de traducción
6. Modificar `email-template.service.ts` para renderizar plantillas según idioma
7. **Testing**: Tests funcionales (unit + integration) + e2e con Supertest verificando headers `Accept-Language`

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/common/i18n/` | New | Servicio y módulo de i18n (es/en/pt) |
| `src/common/errors/` | Modified | Error dictionaries → claves de traducción |
| `src/user/errors/` | Modified | User error messages → i18n |
| `src/email/` | Modified | Plantillas multilingües (es/en/pt) |
| `src/config/` | Modified | Configuración de idiomas soportados |
| `test/i18n/` | New | Tests funcionales de i18n |
| `test/e2e/i18n/` | New | Tests e2e con diferentes idiomas |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Cobertura de traducción incompleta (3 idiomas) | High | Auditoría completa + tests e2e que verifiquen cada idioma |
| Consistencia en detección de idioma | Medium | Middleware centralizado en common module |
| Complejidad en plantillas de email (3 idiomas) | Medium | Usar templates separados por idioma |
| Breaking changes en error codes | Low | Mantener error codes existentes, solo cambiar messages |
| Falla en tests e2e por configuración de idioma | Medium | Mocks de Accept-Language header en test setup |

## Rollback Plan

1. **Código**: Revertir commits de la feature branch `feature/internacionalizacion`
2. **Dependencias**: Desinstalar `nestjs-i18n` si se instaló
3. **Config**: Remover configuración de i18n del módulo principal
4. **Datos**: No hay cambios en BD, rollback es solo código

## Dependencies

- **nestjs-i18n**: Librería para integración con NestJS
- **Accept-Language** header: Estándar para detección de idioma del cliente
- **Supertest**: Para tests e2e verificando respuestas multilingües
- **Jest**: Framework de testing (ya configurado)

## Success Criteria

- [ ] Requests con `Accept-Language: en` reciben mensajes en inglés
- [ ] Requests con `Accept-Language: pt` reciben mensajes en portugués
- [ ] Requests sin header usan idioma por defecto (es)
- [ ] Mensajes de error traducidos en los 3 idiomas (es/en/pt)
- [ ] Emails de bienvenida se envían en el idioma correcto (3 idiomas)
- [ ] Validaciones de class-validator muestran mensajes en el idioma detectado
- [ ] El patrón existente `PASSWORD_MESSAGES` ahora usa `es`, `en` y `pt`
- [ ] **Tests funcionales**: Unit tests para I18nService y error translation
- [ ] **Tests e2e**: Flujos completos (register, login, error responses) en los 3 idiomas
- [ ] Tests existentes siguen pasando (backward compatibility)
- [ ] Cobertura de tests para i18n > 80%
