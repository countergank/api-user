import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { SupportedLanguage, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from './interfaces/i18n.interface';

@Injectable()
export class I18nMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    // Get Accept-Language header
    const acceptLanguage = req.headers['accept-language'];

    // Parse the header and find the first supported language
    let selectedLang: SupportedLanguage = DEFAULT_LANGUAGE;

    if (acceptLanguage) {
      // Parse languages from header (e.g., "pt,en;q=0.9,es;q=0.8")
      const languages = acceptLanguage.split(',').map((lang) => lang.split(';')[0].trim().toLowerCase());

      // Find the first supported language
      for (const lang of languages) {
        if (SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage)) {
          selectedLang = lang as SupportedLanguage;
          break;
        }
      }
    }

    // Set the language in the request object for later use
    (req as any).i18nLang = selectedLang;

    next();
  }
}
