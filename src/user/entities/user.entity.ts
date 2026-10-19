import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Exclude } from 'class-transformer';
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

  @Exclude()
  @Prop({ required: true, select: false })
  password: string;

  @Prop({ enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Prop({ type: [String], default: [] })
  permissions: string[];

  @Prop({ default: false })
  isActive: boolean;

  /**
   * Durable, monotonic session epoch (S16). Every refresh token is stamped with
   * the value current at issue time (`tv`), and rejecting `tv < sessionEpoch`
   * invalidates every token issued before the last bump.
   *
   * It lives in the user document on purpose: a counter kept in a store with a
   * TTL eventually expires and restarts, resurrecting tokens the user already
   * revoked. The default of 0 keeps existing documents valid without a
   * migration.
   */
  @Prop({ default: 0 })
  sessionEpoch: number;

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

  /**
   * Identity-proof code state (S2/S11). The code itself is never persisted:
   * only its sha256 hash (salted with the user id) is stored, so a database dump
   * cannot be replayed against `POST /users/change-email`.
   *
   * `emailChangeCodeAttempts` counts failed validations and
   * `emailChangeCodeSentAt` enforces the 60 s resend throttle. Every field is
   * optional, so existing documents stay valid without a migration.
   */
  @Prop()
  emailChangeCodeHash?: string;

  @Prop({ type: Date, default: undefined })
  emailChangeCodeExpires?: Date;

  @Prop({ default: 0 })
  emailChangeCodeAttempts?: number;

  @Prop({ type: Date, default: undefined })
  emailChangeCodeSentAt?: Date;

  /**
   * Revert window state (S13). Set when the email change is applied, so the
   * previous address can undo the change during the next 72 h.
   *
   * `previousEmail` is unset by the revert itself, which makes the operation
   * idempotent (S6): a second call finds the token, no expired window and no
   * address to restore, so it answers 200 without touching the document.
   */
  @Prop()
  previousEmail?: string;

  @Prop()
  emailRevertToken?: string;

  @Prop({ type: Date, default: undefined })
  emailRevertExpires?: Date;

  @Prop({ default: 0 })
  failedLoginAttempts: number;

  @Prop({ type: Date, default: undefined })
  lockedUntil?: Date;

  @Prop({ type: Date, default: undefined })
  deletedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
