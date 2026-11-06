import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({
  autoIndex: true,
  timestamps: true,
  versionKey: false,
})
export class ActiveSession {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, unique: true })
  sessionId: string;

  @Prop({ required: true, index: true })
  jti: string;

  @Prop()
  ip?: string;

  @Prop()
  userAgent?: string;

  @Prop({ required: true })
  issuedAt: Date;

  @Prop({ required: true })
  lastAccessAt: Date;

  // TTL index: expired refresh windows self-clean without a cron job.
  @Prop({ required: true })
  expiresAt: Date;
}

export const ActiveSessionSchema = SchemaFactory.createForClass(ActiveSession);
