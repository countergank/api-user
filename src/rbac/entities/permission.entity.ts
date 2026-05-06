import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Base } from '../../common/class/base';

export enum PermissionCategory {
  USER = 'user',
  SYSTEM = 'system',
}

@Schema({ timestamps: true, versionKey: false })
export class Permission extends Document {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ enum: PermissionCategory })
  category: PermissionCategory;

  @Prop({ default: false })
  isSystem: boolean;

  @Prop({ default: true })
  isActive: boolean;
}

export const PermissionSchema = SchemaFactory.createForClass(Permission);
