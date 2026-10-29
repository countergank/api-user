import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EmailTemplate } from '../entities/email-template.entity';

@Injectable()
export class EmailTemplateRepository {
  constructor(@InjectModel(EmailTemplate.name) private templateModel: Model<EmailTemplate>) {}

  async findBySlug(slug: string): Promise<EmailTemplate | null> {
    return this.templateModel.findOne({ slug, isActive: true }).exec();
  }

  /**
   * One page of templates plus the total of the filtered set (COU-260).
   * `active === undefined` lists every template, matching the old `findAll`.
   */
  async findPage(filters: {
    active?: boolean;
    page: number;
    limit: number;
  }): Promise<{ templates: EmailTemplate[]; total: number }> {
    const query = filters.active === undefined ? {} : { isActive: filters.active };
    const skip = (filters.page - 1) * filters.limit;

    const [templates, total] = await Promise.all([
      this.templateModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(filters.limit).exec(),
      this.templateModel.countDocuments(query).exec(),
    ]);

    return { templates, total };
  }

  async create(data: Partial<EmailTemplate>): Promise<EmailTemplate> {
    const template = new this.templateModel({
      ...data,
      version: 1,
    });
    return template.save();
  }

  async updateBySlug(slug: string, data: Partial<EmailTemplate>): Promise<EmailTemplate | null> {
    const current = await this.templateModel.findOne({ slug }).exec();
    if (!current) return null;

    const newVersion = (current.version || 1) + 1;

    return this.templateModel.findOneAndUpdate({ slug }, { ...data, version: newVersion }, { new: true }).exec();
  }

  async deleteBySlug(slug: string): Promise<boolean> {
    const result = await this.templateModel.deleteOne({ slug }).exec();
    return result.deletedCount === 1;
  }

  async existsBySlug(slug: string): Promise<boolean> {
    const exists = await this.templateModel.exists({ slug }).exec();
    return Boolean(exists);
  }
}
