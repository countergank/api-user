import { Logger } from '@nestjs/common';
import { Connection } from 'mongoose';

/**
 * Runs a callback inside a MongoDB transaction with graceful degradation.
 *
 * If the MongoDB instance does not support sessions (e.g. standalone),
 * the callback runs without a transaction. Errors from the transaction
 * are propagated to the caller.
 *
 * @param connection - Mongoose connection
 * @param callback - Function to execute within the transaction
 * @param logger - Optional logger instance (avoids module-level Logger)
 */
export async function runInTransaction<T>(
  connection: Connection,
  callback: (session: import('mongoose').ClientSession) => Promise<T>,
  logger?: Logger,
): Promise<T> {
  let session: import('mongoose').ClientSession | undefined;

  try {
    session = await connection.startSession();
  } catch (err) {
    logger?.warn('startSession failed — falling back to non-transactional execution');
    return callback(undefined as any);
  }

  try {
    return await session.withTransaction(() => callback(session!));
  } finally {
    await session.endSession();
  }
}
