import { Injectable, Inject, Logger } from '@nestjs/common';
import { I18nService as NestI18nService, I18nContext } from 'nestjs-i18n';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { SupportedLanguage, DEFAULT_LANGUAGE, II18nService } from './interfaces/i18n.interface';

@Injectable()
export class I18nService implements II18nService {
  private readonly logger = new Logger(I18nService.name);
  private translations: Map<string, Record<string, any>> = new Map();

  constructor(
    @Inject(NestI18nService)
    private readonly nestI18nService: NestI18nService,
  ) {
    this.loadTranslations();
  }

  /**
   * Translate a key to the specified language (or active language)
   */
  async translate(key: string, lang?: string, params?: Record<string, any>): Promise<string> {
    try {
      const language = lang || this.getLanguage();
      // Try our direct loader first
      const direct = this.resolveDirect(key, language);
      if (direct) return this.interpolate(direct, params);
      
      // Fallback to nestjs-i18n
      const result = await this.nestI18nService.translate(key, { lang: language, args: params });
      return typeof result === 'string' ? result : key;
    } catch {
      return key;
    }
  }

  getLanguage(): SupportedLanguage {
    try {
      const ctx = I18nContext.current();
      if (ctx && ctx.lang) return ctx.lang as SupportedLanguage;
    } catch {}
    return DEFAULT_LANGUAGE;
  }

  setLanguage(lang: SupportedLanguage): void {
    // no-op: language is set by middleware / HeaderResolver
  }

  // ── direct JSON loader ──────────────────────────────

  private loadTranslations(): void {
    const dirs = [
      path.join(__dirname, 'translations'),
      path.join(process.cwd(), 'src', 'common', 'i18n', 'translations'),
    ];
    
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) continue;
      for (const file of fs.readdirSync(dir)) {
        const lang = path.basename(file, '.json');
        const fullPath = path.join(dir, file);
        try {
          this.translations.set(lang, JSON.parse(fs.readFileSync(fullPath, 'utf-8')));
        } catch {}
      }
      if (this.translations.size > 0) break;
    }
  }

  private resolveDirect(key: string, lang: string): string | undefined {
    const tree = this.translations.get(lang);
    if (!tree) return undefined;
    const parts = key.split('.');
    let node: any = tree;
    for (const part of parts) {
      node = node?.[part];
      if (node === undefined) return undefined;
    }
    return typeof node === 'string' ? node : undefined;
  }

  private interpolate(text: string, params?: Record<string, any>): string {
    if (!params || !text) return text;
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) =>
      params[key] !== undefined ? String(params[key]) : `{{${key}}}`,
    );
  }
}
