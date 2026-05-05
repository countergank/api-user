# Tasks: Internacionalización (i18n) para API User

## Phase 1: Foundation / Infrastructure

- [ ] 1.1 Install nestjs-i18n package: `npm install nestjs-i18n`
- [ ] 1.2 Create `src/common/i18n/interfaces/i18n.interface.ts` with I18nService interface and SupportedLanguage type
- [ ] 1.3 Create `src/common/i18n/i18n.module.ts` configuring nestjs-i18n with es/en/pt support
- [ ] 1.4 Create `src/common/i18n/translations/es.json` with Spanish translations (error messages, validation messages)
- [ ] 1.5 Create `src/common/i18n/translations/en.json` with English translations
- [ ] 1.6 Create `src/common/i18n/translations/pt.json` with Portuguese translations
- [ ] 1.7 Create `src/common/i18n/i18n.middleware.ts` to detect Accept-Language header and set language
- [ ] 1.8 Create `src/common/i18n/i18n.service.ts` wrapping nestjs-i18n with translate(), getLanguage(), setLanguage()
- [ ] 1.9 Import I18nModule in `src/config/config.module.ts` and register I18nMiddleware

## Phase 2: Error Messages Translation

- [ ] 2.1 Modify `src/common/errors/error.dictionary.ts` to use `{ es, en, pt }` structure with translation keys
- [ ] 2.2 Modify `src/user/errors/error.dictionary.ts` to use `{ es, en, pt }` structure with translation keys
- [ ] 2.3 Update `src/common/errors/error-filter.ts` to use I18nService for translating error messages
- [ ] 2.4 Extend `PASSWORD_MESSAGES` in `src/common/interfaces/password-validation.interface.ts` to include `pt` translations
- [ ] 2.5 Update `PASSWORD_HINTS` in `src/common/interfaces/password-validation.interface.ts` to include `pt`

## Phase 3: Validation Messages

- [ ] 3.1 Create custom validation decorator wrapper that supports i18n messages from translation files
- [ ] 3.2 Configure class-validator to use I18nService for validation error messages
- [ ] 3.3 Update existing DTOs to use i18n-aware validation decorators

## Phase 4: Email Templates

- [ ] 4.1 Create `src/email/templates/en/` directory with welcome.en.html, password-reset.en.html, email-change.en.html, password-changed.en.html
- [ ] 4.2 Create `src/email/templates/pt/` directory with welcome.pt.html, password-reset.pt.html, email-change.pt.html, password-changed.pt.html
- [ ] 4.3 Modify `src/email/service/email-template.service.ts` to select template based on user's language (from I18nService)
- [ ] 4.4 Update DEFAULT_TEMPLATES in `email-template.service.ts` to include language-specific subjects for en and pt

## Phase 5: Testing

- [ ] 5.1 Create `test/i18n/i18n.service.spec.ts` with unit tests for I18nService.translate(), getLanguage(), setLanguage()
- [ ] 5.2 Create `test/i18n/error-translation.spec.ts` with integration tests verifying error messages in es/en/pt
- [ ] 5.3 Create `test/e2e/i18n/language-detection.e2e-spec.ts` testing Accept-Language header detection
- [ ] 5.4 Create `test/e2e/i18n/error-messages.e2e-spec.ts` testing error responses in 3 languages
- [ ] 5.5 Create `test/e2e/i18n/auth-flows.e2e-spec.ts` testing register/login flows with different Accept-Language values
- [ ] 5.6 Create `test/e2e/i18n/validation-messages.e2e-spec.ts` testing validation error messages in es/en/pt
- [ ] 5.7 Run `npm run test:cov` and verify i18n coverage is > 80%
- [ ] 5.8 Run existing tests to ensure backward compatibility (no regressions)

## Phase 6: Cleanup & Documentation

- [ ] 6.1 Update API documentation in each module's `api-docs/` to reflect i18n support (Accept-Language header)
- [ ] 6.2 Add inline comments in i18n files explaining the pattern and usage
- [ ] 6.3 Verify all translation keys exist in es.json, en.json, and pt.json (no missing keys)
- [ ] 6.4 Run linter: `npx biome lint --diagnostic-level=error ./src`
- [ ] 6.5 Run formatter: `npx biome format --fix ./src`
