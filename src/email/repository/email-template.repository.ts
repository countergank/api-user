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

  async findActive(): Promise<EmailTemplate[]> {
    return this.templateModel.find({ isActive: true }).sort({ createdAt: -1 }).exec();
  }

  async findAll(): Promise<EmailTemplate[]> {
    return this.templateModel.find().sort({ createdAt: -1 }).exec();
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
