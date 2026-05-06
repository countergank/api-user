import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { I18nService as NestI18nService, I18nContext } from 'nestjs-i18n';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { SupportedLanguage, DEFAULT_LANGUAGE, II18nService } from './interfaces/i18n.interface';
import { I18nTranslation } from './entities/i18n-translation.entity';

@Injectable()
export class I18nService implements II18nService, OnModuleInit {
  private readonly logger = new Logger(I18nService.name);
  private translations: Map<string, Record<string, any>> = new Map();

  constructor(
    @Inject(NestI18nService)
    private readonly nestI18nService: NestI18nService,
    @InjectModel(I18nTranslation.name)
    private readonly i18nModel: Model<I18nTranslation>,
  ) {}

  async onModuleInit() {
    await this.loadFromMongo();
  }

  // ── public API ────────────────────────────────────────

  async translate(key: string, lang?: string, params?: Record<string, any>): Promise<string> {
    try {
      const language = lang || this.getLanguage();
      const direct = this.resolveDirect(key, language);
      if (direct) return this.interpolate(direct, params);
      const result = await this.nestI18nService.translate(key, { lang: language, args: params });
      return typeof result === 'string' ? result : key;
    } catch {
      return key;
    }
  }

  getLanguage(): SupportedLanguage {
    try {
      const ctx = I18nContext.current();
      if (ctx?.lang) return ctx.lang as SupportedLanguage;
    } catch {}
    return DEFAULT_LANGUAGE;
  }

  setLanguage(_lang: SupportedLanguage): void {}

  /** Reload translations from MongoDB (call via POST /admin/i18n/reload) */
  async reloadFromMongo(): Promise<void> {
    await this.loadFromMongo();
  }

  // ── MongoDB loader ────────────────────────────────────

  private async loadFromMongo(): Promise<void> {
    const count = await this.i18nModel.countDocuments();
    if (count === 0) {
      this.logger.log('No translations in MongoDB, seeding from JSON files...');
      await this.seedFromJson();
      return;
    }

    const docs = await this.i18nModel.find().lean().exec();
    this.translations.clear();

    for (const doc of docs) {
      if (!this.translations.has(doc.lang)) {
        this.translations.set(doc.lang, {});
      }
      this.setNested(this.translations.get(doc.lang)!, doc.key, doc.value);
    }

    this.logger.log(`Loaded ${docs.length} translations from MongoDB`);
  }

  private async seedFromJson(): Promise<void> {
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
          const data = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
          this.translations.set(lang, data);

          // Also insert into MongoDB
          const bulk = this.flattenTranslations(data, lang);
          if (bulk.length > 0) {
            await this.i18nModel.insertMany(bulk, { ordered: false }).catch(() => {});
          }
        } catch {}
      }
      if (this.translations.size > 0) break;
    }

    this.logger.log(`Seeded ${await this.i18nModel.countDocuments()} translations to MongoDB`);
  }

  // ── helpers ───────────────────────────────────────────

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
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => (params[key] !== undefined ? String(params[key]) : `{{${key}}}`));
  }

  private setNested(obj: Record<string, any>, key: string, value: string): void {
    const parts = key.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) current[parts[i]] = {};
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
  }

  private flattenTranslations(
    obj: Record<string, any>,
    lang: string,
    prefix = '',
  ): { key: string; lang: string; value: string }[] {
    const result: { key: string; lang: string; value: string }[] = [];
    for (const [k, v] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${k}` : k;
      if (typeof v === 'string') {
        result.push({ key: fullKey, lang, value: v });
      } else if (typeof v === 'object' && v !== null) {
        result.push(...this.flattenTranslations(v, lang, fullKey));
      }
    }
    return result;
  }
}
