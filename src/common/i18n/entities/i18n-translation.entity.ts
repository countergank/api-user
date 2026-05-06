import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class I18nTranslation extends Document {
  @Prop({ required: true })
  key: string;

  @Prop({ required: true, enum: ['es', 'en', 'pt'] })
  lang: string;

  @Prop({ required: true })
  value: string;
}

export const I18nTranslationSchema = SchemaFactory.createForClass(I18nTranslation);
