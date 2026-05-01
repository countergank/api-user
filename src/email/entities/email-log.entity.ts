import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Base } from '../../common/class/base';

@Schema({
  autoIndex: true,
  timestamps: true,
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class EmailLog extends Base {
  @Prop({ required: true })
  recipient: string;

  @Prop()
  templateSlug?: string;

  @Prop({ required: true })
  subject: string;

  @Prop({ required: true })
  provider: string;

  @Prop({ required: true, enum: ['pending', 'sent', 'failed'] })
  status: string;

  @Prop()
  messageId?: string;

  @Prop()
  error?: string;

  @Prop({ type: Object })
  metadata?: Record<string, unknown>;
}

export const EmailLogSchema = SchemaFactory.createForClass(EmailLog);
