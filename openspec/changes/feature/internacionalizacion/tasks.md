# Tasks: Internacionalización (i18n) para API User

## Phase 1: Foundation / Infrastructure

- [x] 1.1 Install nestjs-i18n package: `npm install nestjs-i18n`
- [x] 1.2 Create `src/common/i18n/interfaces/i18n.interface.ts` with I18nService interface and SupportedLanguage type
- [x] 1.3 Create `src/common/i18n/i18n.module.ts` configuring nestjs-i18n with es/en/pt support
- [x] 1.4 Create `src/common/i18n/translations/es.json` with Spanish translations
- [x] 1.5 Create `src/common/i18n/translations/en.json` with English translations
- [x] 1.6 Create `src/common/i18n/translations/pt.json` with Portuguese translations
- [x] 1.7 Create `src/common/i18n/i18n.middleware.ts` to detect Accept-Language header
- [x] 1.8 Create `src/common/i18n/i18n.service.ts` with direct JSON loading + translate()
- [x] 1.9 Import I18nModule in AppModule and EmailModule, RbacModule

## Phase 2: Error Messages Translation

- [x] 2.1 Modify `src/common/errors/error.dictionary.ts` → `{ es, en, pt }`
- [x] 2.2 Modify `src/user/errors/error.dictionary.ts` → `{ es, en, pt }`
- [x] 2.3 Update `ErrorFilter` to translate via I18nService with async translation
- [x] 2.4 Extend `PASSWORD_MESSAGES` with `pt` translations
- [x] 2.5 Update `PASSWORD_HINTS` with `pt`

## Phase 3: Validation Messages

- [x] 3.1 `PasswordStrengthValidator` returns error codes → ErrorFilter translates
- [x] 3.2 `ErrorFilter.translateValidation()` handles PASSWORD_ prefix
- [x] 3.3 Non-alphanumeric character validation (replaced fixed special chars list)

## Phase 4: Email Templates

- [x] 4.1 Create `src/email/templates/en/` (4 templates)
- [x] 4.2 Create `src/email/templates/pt/` (4 templates)
- [x] 4.3 `EmailTemplateService.resolve()` selects template by language, skips DB for non-es
- [x] 4.4 Language-specific subjects via I18nService.translate()

## Phase 5: Testing

- [x] 5.1 `src/common/i18n/i18n.service.spec.ts` (unit tests, 94% coverage)
- [x] 5.2 `src/common/i18n/i18n.middleware.spec.ts` (100% coverage)
- [x] 5.3 `test/e2e/i18n/` (4 e2e spec files)
- [x] 5.7 Coverage for i18n > 80% (97.14%)
- [x] 5.8 All existing tests pass (111 tests)

## Phase 6: Cleanup & Documentation

- [x] 6.1 Swagger global parameter with `accept-language` dropdown
- [x] 6.2 Shared helpers: `request-lang.helper.ts`, `rbac-translate.helper.ts`
- [x] 6.3 RBAC roles & permissions internationalized
- [x] 6.4 Linter & formatter run

## Beyond original scope (done)

- [x] `@Req()` pattern for language extraction (no Swagger auto-detection issues)
- [x] `AcceptLanguageResolver` configured (class reference, not `new`)
- [x] `nestjs-cls` installed for I18nContext support
- [x] AuthModule → removed `@Global()` (not needed)
- [x] Permission permissions cleaned (timer/org/integration removed)
- [x] Default role permissions cleaned (USER: user:read+update, VIEWER: user:read)
- [x] PermissionCategory enum cleaned (only USER, SYSTEM)
- [x] 12 RBAC permissions with translations

## Pending — Next SDD Change

- [ ] MongoDB-backed i18n translations (no redeploy needed)
- [ ] `POST /admin/i18n/reload` endpoint
- [ ] Remove debug logs
- [ ] Commit and archive `feature/internacionalizacion`
