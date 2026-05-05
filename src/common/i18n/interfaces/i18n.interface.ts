/**
 * Internationalization (i18n) interfaces and types
 * Supports Spanish (es), English (en), and Portuguese (pt)
 */

export type SupportedLanguage = 'es' | 'en' | 'pt';

export const DEFAULT_LANGUAGE: SupportedLanguage = 'es';

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['es', 'en', 'pt'];

export interface TranslationKey {
  es: string;
  en: string;
  pt: string;
}

export interface II18nService {
  /**
   * Translate a key to the specified language (or active language)
   * @param key - The translation key (e.g., 'errors.USER_NOT_FOUND')
   * @param lang - Optional language override (uses active language if not provided)
   * @param params - Optional parameters for interpolation
   * @returns The translated string
   */
  translate(key: string, lang?: string, params?: Record<string, any>): string;

  /**
   * Get the current active language
   * @returns The active language code
   */
  getLanguage(): SupportedLanguage;

  /**
   * Set the active language for the current context
   * @param lang - The language code to set
   */
  setLanguage(lang: SupportedLanguage): void;
}
