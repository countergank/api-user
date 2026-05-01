import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Base } from '../../common/class/base';

@Schema({
  autoIndex: true,
  timestamps: true,
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class EmailTemplate extends Base {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true })
  slug: string;

  @Prop({ required: true })
  subject: string;

  @Prop({ required: true })
  content: string;

  @Prop({ type: [String], default: [] })
  variables: string[];

  @Prop()
  imageUrl?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 1 })
  version: number;
}

export const EmailTemplateSchema = SchemaFactory.createForClass(EmailTemplate);
