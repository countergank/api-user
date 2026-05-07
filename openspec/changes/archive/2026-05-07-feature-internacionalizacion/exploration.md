## Exploration: feature/internacionalizacion

### Current State
The api-user project (NestJS + TypeScript + MongoDB) currently has **NO internationalization (i18n) support**. Key findings:

1. **No i18n libraries installed** - package.json shows no nestjs-i18n, i18next, or similar libraries
2. **No language detection** - No Accept-Language header processing or locale detection middleware exists
3. **Hardcoded Spanish messages** - All error messages in error dictionaries are Spanish-only:
   - `/src/common/errors/error.dictionary.ts`: "Error genérico"
   - `/src/user/errors/error.dictionary.ts`: "Error en User", "el nombre ya existe", etc.
4. **Spanish-only email templates** - All 4 default email templates (welcome, password-reset, email-change, password-changed) are in Spanish with `<html lang="es">`
5. **class-validator without i18n** - DTO validation uses class-validator but returns default English messages from the library, not customized

### Existing Bilingual Pattern (Partial)
There IS one bilingual pattern in the codebase that can serve as a model:
- **File**: `/src/common/interfaces/password-validation.interface.ts`
- **Pattern**: `PASSWORD_MESSAGES` uses `{ es: '...', en: '...' }` structure
- **Issue**: The validator (`password-strength.validator.ts`) only uses `.es` messages, ignoring the `en` option

### Affected Areas
- `src/common/errors/**` — Error dictionaries and ErrorBase class need i18n support
- `src/common/interfaces/password-validation.interface.ts` — Already has structure, needs language selection
- `src/common/validators/password-strength.validator.ts` — Needs to use language context
- `src/user/errors/error.dictionary.ts` — Spanish-only, needs English translations
- `src/email/templates/**` — All templates are Spanish-only HTML
- `src/email/service/email-template.service.ts` — Template subjects are hardcoded in Spanish
- `src/main.ts` — Need to add language detection middleware
- All DTOs with class-validator — Need custom messages or i18n integration

### Approaches

1. **Use nestjs-i18n library** — Dedicated NestJS i18n module with JSON translation files
   - Pros: Well-integrated with NestJS, supports GraphQL/REST, has decorators for i18n in templates
   - Cons: Additional dependency, learning curve, requires restructuring error handling
   - Effort: Medium

2. **Follow existing PASSWORD_MESSAGES pattern** — Extend the `{ es: '...', en: '...' }` pattern used in password validation
   - Pros: Consistent with existing code, no new dependencies, simpler implementation
   - Cons: Manual work for all messages, no built-in language detection, less scalable
   - Effort: Low

3. **Custom i18n service with Accept-Language header** — Build lightweight service that reads Accept-Language and serves translations
   - Pros: Full control, lightweight, can integrate with existing patterns
   - Cons: Need to build from scratch, more initial development time
   - Effort: Medium

4. **Hybrid: class-validator-i18n + custom error handling** — Use class-validator-i18n for DTOs and custom service for errors
   - Pros: Best for validation messages, keeps error handling flexible
   - Cons: Two systems to maintain, inconsistent approach
   - Effort: Medium-High

### Recommendation
**Approach 2 (Extend existing pattern) with enhancements**:

Given that the codebase already has a bilingual pattern in `PASSWORD_MESSAGES`, I recommend:
1. Create a central `i18n/` folder with translation JSON files (es.json, en.json)
2. Build a simple `I18nService` that reads Accept-Language header and serves translations
3. Modify `ErrorBase` to accept a language parameter and use translation keys
4. Update `password-strength.validator.ts` to use the language context
5. Create English versions of all email templates

This approach:
- Builds on existing patterns (low resistance)
- Avoids new heavy dependencies
- Can be incrementally adopted
- Is sufficient for a REST API with 2 languages

### Risks
- **Translation coverage**: Ensuring all user-facing strings are covered (error messages, validation messages, email templates)
- **Language detection consistency**: Making sure the language context is properly passed through all layers (controller → service → error handling)
- **Email template complexity**: Managing bilingual email templates (either duplicate templates or dynamic rendering)
- **Backward compatibility**: Ensuring existing error codes/messages still work while adding i18n

### Ready for Proposal
**Yes** — The exploration is complete. The orchestrator should tell the user:
- Current state: No i18n support, hardcoded Spanish
- Existing pattern: PASSWORD_MESSAGES shows the way forward
- Recommended approach: Centralized translation files + simple I18nService
- Next step: Create proposal with detailed implementation plan for the hybrid approach
