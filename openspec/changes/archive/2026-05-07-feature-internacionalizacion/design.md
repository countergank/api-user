# Design: Internacionalización (i18n) para API User

## Technical Approach

Implementar i18n usando **nestjs-i18n** como librería central, extendiendo el patrón existente `PASSWORD_MESSAGES` que ya usa `{ es: '...', en: '...' }` para soportar 3 idiomas (es/en/pt). El diseño sigue una arquitectura modular en `src/common/i18n/` con un `I18nModule` que provee `I18nService` para toda la aplicación.

## Architecture Decisions

### Decision: Use nestjs-i18n as i18n library

**Choice**: nestjs-i18n (https://docs.nestjs.com/recipes/i18n)

**Alternatives considered**:
- Custom i18n service (rejected: más tiempo de desarrollo, menos mantenido)
- i18next (rejected: no integración nativa con NestJS, más complejidad)

**Rationale**: nestjs-i18n se integra nativamente con NestJS, soporta decoradores `@I18nLang()` para inyección de idioma, y maneja `Accept-Language` automáticamente. Es la solución estándar para el ecosistema NestJS.

### Decision: Extend PASSWORD_MESSAGES pattern to all error dictionaries

**Choice**: Usar estructura `{ es: string, en: string, pt: string }` para todos los diccionarios de errores

**Alternatives considered**:
- Claves de traducción planas con archivos JSON separados por idioma (rejected: rompe el patrón existente)
- Mantener strings hardcodeados y usar servicio de traducción separado (rejected: más complejidad, dos fuentes de verdad)

**Rationale**: El proyecto YA tiene el patrón `{ es: '...', en: '...' }` en `PASSWORD_MESSAGES`. Extender esto a `pt` y aplicarlo a todos los error dictionaries mantiene consistencia y reduce la curva de aprendizaje.

### Decision: Middleware-based language detection via Accept-Language header

**Choice**: Middleware que procesa `Accept-Language` y establece el idioma en el contexto de la request

**Alternatives considered**:
- Interceptor (rejected: los interceptores corren después de los guards, necesitamos el idioma disponible temprano)
- Query parameter `?lang=` (rejected: no es estándar, menos flexible)

**Rationale**: El header `Accept-Language` es el estándar HTTP para detección de idioma del cliente. Un middleware asegura que el idioma esté disponible antes de que cualquier lógica de negocio se ejecute.

### Decision: Email templates organized by language directory

**Choice**: Estructura de directorios `src/email/templates/{lang}/` con archivos separados por idioma

**Alternatives considered**:
- Templates dinámicos con interpolación de idioma (rejected: más complejidad, templates difíciles de mantener)
- Un solo template con bloques condicionales por idioma (rejected: templates se vuelven ilegibles)

**Rationale**: Templates separados por idioma son más fáciles de mantener, traducir y versionar. La estructura clara ayuda a los traductores a entender qué archivos tocar.

## Data Flow

```
Client Request (Accept-Language: pt)
       │
       ▼
┌─────────────────────┐
│  I18nMiddleware     │ ← Detecta idioma, establece en I18nService
└─────────────────────┘
       │
       ▼
┌─────────────────────┐
│  Controller         │ ← @I18nLang() inyecta idioma actual
└─────────────────────┘
       │
       ▼
┌─────────────────────┐
│  Service Layer      │ ← Usa I18nService.translate(key, lang)
└─────────────────────┘
       │
       ▼
┌─────────────────────┐
│  Error Handling     │ ← Error dictionaries devuelven { es, en, pt }
│  (ErrorBase)        │ ← ErrorFilter traduce según idioma actual
└─────────────────────┘
       │
       ▼
┌─────────────────────┐
│  Email Service      │ ← Selecciona template de /templates/{lang}/
└─────────────────────┘
       │
       ▼
Client Response (message in Portuguese)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/common/i18n/i18n.module.ts` | Create | Módulo de i18n que configura nestjs-i18n |
| `src/common/i18n/i18n.service.ts` | Create | Servicio wrapper para traducciones |
| `src/common/i18n/i18n.middleware.ts` | Create | Middleware para detectar Accept-Language |
| `src/common/i18n/translations/es.json` | Create | Traducciones en español |
| `src/common/i18n/translations/en.json` | Create | Traducciones en inglés |
| `src/common/i18n/translations/pt.json` | Create | Traducciones en portugués |
| `src/common/i18n/interfaces/i18n.interface.ts` | Create | Interfaces TypeScript para i18n |
| `src/common/errors/error.dictionary.ts` | Modify | Agregar claves de traducción (es/en/pt) |
| `src/user/errors/error.dictionary.ts` | Modify | Agregar claves de traducción (es/en/pt) |
| `src/common/interfaces/password-validation.interface.ts` | Modify | Extender PASSWORD_MESSAGES con `pt` |
| `src/email/service/email-template.service.ts` | Modify | Soporte para seleccionar template por idioma |
| `src/email/templates/en/` | Create | Templates de email en inglés |
| `src/email/templates/pt/` | Create | Templates de email en portugués |
| `src/common/errors/error-filter.ts` | Modify | Usar I18nService para traducir errores |
| `src/config/config.module.ts` | Modify | Importar I18nModule |
| `test/i18n/i18n.service.spec.ts` | Create | Unit tests para I18nService |
| `test/i18n/error-translation.spec.ts` | Create | Integration tests para traducción de errores |
| `test/e2e/i18n/language-detection.e2e-spec.ts` | Create | e2e: detección de idioma |
| `test/e2e/i18n/error-messages.e2e-spec.ts` | Create | e2e: mensajes de error en 3 idiomas |
| `test/e2e/i18n/auth-flows.e2e-spec.ts` | Create | e2e: flujos de auth con diferentes idiomas |

## Interfaces / Contracts

```typescript
// src/common/i18n/interfaces/i18n.interface.ts

export interface TranslationKey {
  es: string;
  en: string;
  pt: string;
}

export interface I18nService {
  /**
   * Translate a key to the specified language (or active language)
   */
  translate(key: string, lang?: string, params?: Record<string, any>): string;

  /**
   * Get the current active language
   */
  getLanguage(): string;

  /**
   * Set the active language for the current context
   */
  setLanguage(lang: string): void;
}

export type SupportedLanguage = 'es' | 'en' | 'pt';
export const DEFAULT_LANGUAGE: SupportedLanguage = 'es';
export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['es', 'en', 'pt'];
```

```typescript
// Example error dictionary structure (extended from existing)

export const ERROR_DICTIONARY = {
  USER_NOT_FOUND: {
    es: 'Usuario no encontrado',
    en: 'User not found',
    pt: 'Usuário não encontrado',
  },
  INVALID_CREDENTIALS: {
    es: 'Credenciales inválidas',
    en: 'Invalid credentials',
    pt: 'Credenciais inválidas',
  },
};
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| **Unit** | I18nService.translate() | Mock translations, verify key resolution, fallback behavior |
| **Unit** | I18nMiddleware | Mock Accept-Language header, verify language is set |
| **Integration** | Error translation | Throw errors, verify messages are in correct language |
| **Integration** | Email template selection | Request with different languages, verify template used |
| **e2e** | Language detection | Supertest requests with Accept-Language header |
| **e2e** | Error messages in 3 languages | Trigger errors, verify response messages |
| **e2e** | Auth flows (register, login) | Complete flows with different Accept-Language values |
| **e2e** | Validation messages | Send invalid DTOs, verify messages in correct language |

## Migration / Rollout

No migration required. Los cambios son:
1. **Code-only**: No hay cambios en la base de datos
2. **Backward compatible**: Los error codes se mantienen igual, solo cambian los messages
3. **Feature flag**: No se requiere, se puede hacer merge a develop y desplegar incrementalmente

## Open Questions

- [ ] ¿Usar `nestjs-i18n` o `@nestjs-i18n/core`? (verificar cuál es el paquete correcto en npm)
- [ ] ¿Dónde almacenar las traducciones? (archivos JSON en `/i18n/translations/` vs base de datos)
- [ ] ¿Cómo manejar class-validator? (¿decorador personalizado o configuración global?)
