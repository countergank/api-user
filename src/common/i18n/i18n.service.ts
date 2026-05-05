import { Injectable, Inject } from '@nestjs/common';
import { I18nService as NestI18nService, I18nContext } from 'nestjs-i18n';
import { SupportedLanguage, DEFAULT_LANGUAGE, II18nService } from './interfaces/i18n.interface';

@Injectable()
export class I18nService implements II18nService {
  constructor(
    @Inject(NestI18nService)
    private readonly nestI18nService: NestI18nService,
  ) {}

  /**
   * Translate a key to the specified language (or active language)
   */
  translate(key: string, lang?: string, params?: Record<string, any>): string {
    try {
      // Get the language from parameters or current context
      const language = lang || this.getLanguage();

      // Use nestjs-i18n to translate
      // The nestjs-i18n service uses the current context by default
      const translation = this.nestI18nService.translate(key, { lang: language, args: params });

      // If translation is a Promise, handle it (nestjs-i18n may return Promise in some cases)
      if (translation instanceof Promise) {
        // In a synchronous context, we can't await. Return key as fallback.
        return key;
      }

      // Ensure we return a string
      return typeof translation === 'string' ? translation : key;
    } catch (error) {
      // Fallback to key if translation fails
      return key;
    }
  }

  /**
   * Get the current active language from I18nContext
   */
  getLanguage(): SupportedLanguage {
    try {
      const ctx = I18nContext.current();
      if (ctx && ctx.lang) {
        return ctx.lang as SupportedLanguage;
      }
    } catch (error) {
      // I18nContext might not be available (outside request context)
    }
    return DEFAULT_LANGUAGE;
  }

  /**
   * Set the active language for the current context
   * Note: In nestjs-i18n, language is typically set via middleware/interceptor
   * This method is provided for compatibility with the interface
   */
  setLanguage(lang: SupportedLanguage): void {
    // nestjs-i18n handles language via I18nContext
    // This is a no-op for compatibility, language is set by middleware
  }
}
