import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Base } from '../../common/class/base';
import { UserRole } from '../../user/entities/user.entity';

@Schema({ timestamps: true, versionKey: false })
export class Role extends Document {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ type: [String], default: [] })
  permissionIds: string[];

  @Prop({ default: false })
  isSystem: boolean;

  @Prop({ default: false })
  isDefault: boolean;
}

export const RoleSchema = SchemaFactory.createForClass(Role);
