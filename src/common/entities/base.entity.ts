import { Prop } from '@nestjs/mongoose';
import { Types } from 'mongoose';

export abstract class BaseEntity {
  _id?: Types.ObjectId;

  @Prop({ required: true, default: Date.now })
  created_at?: Date;

  @Prop({ required: true, default: Date.now })
  updated_at?: Date;
}
