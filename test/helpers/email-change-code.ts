import { INestApplication } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import request from 'supertest';
import { EmailEvents } from '../../src/email/constants/email.events';
import { User } from '../../src/user/entities/user.entity';

/**
 * COU-263 e2e helpers.
 *
 * The identity-proof code is hashed at rest and never travels in the HTTP
 * response (S2, S8), so the only way a test can learn it is to listen to the
 * same event the email listener consumes. That is the contract the spec asks for:
 * the specs capture events, not SMTP.
 */
export async function requestEmailChangeCode(app: INestApplication, accessToken: string): Promise<string> {
  const emitter = app.get(EventEmitter2);
  const captured = new Promise<string>((resolve) => {
    emitter.once(EmailEvents.EMAIL_CHANGE_CODE_REQUESTED, (payload: { code: string }) => resolve(payload.code));
  });

  const response = await request(app.getHttpServer())
    .post('/users/change-email/code')
    .set('Authorization', `Bearer ${accessToken}`)
    .expect(200);

  // S8: the response carries the message and nothing else.
  expect(Object.keys(response.body)).toEqual(['message']);
  expect(JSON.stringify(response.body)).not.toMatch(/\b\d{6}\b/);

  return captured;
}

/**
 * Clears the 60 s resend throttle (S11) so a spec can request more than one code
 * without waiting a real minute.
 */
export async function clearEmailChangeCodeThrottle(app: INestApplication, email: string): Promise<void> {
  const userModel = app.get<Model<User>>(getModelToken(User.name));
  await userModel.updateOne({ email }, { $unset: { emailChangeCodeSentAt: 1 } }).exec();
}

/** Reads the user document straight from Mongo, for state assertions. */
export async function findUserDocument(app: INestApplication, filter: Record<string, unknown>): Promise<User | null> {
  const userModel = app.get<Model<User>>(getModelToken(User.name));
  return userModel.findOne(filter).exec();
}
