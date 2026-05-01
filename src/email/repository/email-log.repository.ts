import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EmailLog } from '../entities/email-log.entity';

@Injectable()
export class EmailLogRepository {
  constructor(@InjectModel(EmailLog.name) private logModel: Model<EmailLog>) {}

  async create(data: Partial<EmailLog>): Promise<EmailLog> {
    const log = new this.logModel(data);
    return log.save();
  }

  async findByRecipient(recipient: string, limit = 50): Promise<EmailLog[]> {
    return this.logModel.find({ recipient }).sort({ createdAt: -1 }).limit(limit).exec();
  }

  async findAll(page = 1, limit = 50): Promise<{ logs: EmailLog[]; total: number }> {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      this.logModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.logModel.countDocuments(),
    ]);

    return { logs, total };
  }

  async update(id: string, data: Partial<EmailLog>): Promise<EmailLog | null> {
    return this.logModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }
}
