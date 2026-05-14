import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Base } from '../../common/class/base';

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  VIEWER = 'viewer',
}

@Schema({
  autoIndex: true,
  timestamps: true,
  versionKey: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class User extends Base {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ unique: true, required: true })
  email: string;

  @Prop({ unique: true, required: true })
  userName: string;

  @Prop({ required: true })
  password: string;

  @Prop({ enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Prop({ type: [String], default: [] })
  permissions: string[];

  @Prop({ default: false })
  isActive: boolean;

  @Prop()
  resetPasswordToken?: string;

  @Prop()
  resetPasswordExpires?: Date;

  @Prop()
  emailVerificationToken?: string;

  @Prop()
  emailVerificationExpires?: Date;

  @Prop()
  pendingEmail?: string;

  @Prop()
  pendingEmailToken?: string;

  @Prop()
  pendingEmailExpires?: Date;

  @Prop({ default: 0 })
  failedLoginAttempts: number;

  @Prop({ type: Date, default: undefined })
  lockedUntil?: Date;

  @Prop({ type: Date, default: undefined })
  deletedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
