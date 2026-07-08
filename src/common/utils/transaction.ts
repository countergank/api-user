import { Logger } from '@nestjs/common';
import { Connection } from 'mongoose';

const logger = new Logger('runInTransaction');

/**
 * Runs a callback inside a MongoDB transaction with graceful degradation.
 *
 * If the MongoDB instance does not support sessions (e.g. standalone),
 * the callback runs without a transaction. Errors from the transaction
 * are propagated to the caller.
 */
export async function runInTransaction<T>(
  connection: Connection,
  callback: (session: import('mongoose').ClientSession) => Promise<T>,
): Promise<T> {
  let session: import('mongoose').ClientSession | undefined;

  try {
    session = await connection.startSession();
  } catch (err) {
    logger.warn('startSession failed — falling back to non-transactional execution');
    return callback(undefined as any);
  }

  try {
    return await session.withTransaction(() => callback(session!));
  } finally {
    await session.endSession();
  }
}
