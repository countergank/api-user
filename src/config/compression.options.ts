import fastifyCompress, { type FastifyCompressOptions } from '@fastify/compress';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

/**
 * Shared @fastify/compress registration options.
 *
 * - Brotli first: @fastify/compress v7 supports `br` and ships recommended
 *   brotli options; clients that advertise `br` get better ratios than gzip.
 * - Explicit threshold in bytes: responses smaller than this are sent
 *   uncompressed, since compressing tiny JSON payloads wastes CPU.
 */
export const COMPRESSION_OPTIONS: FastifyCompressOptions = {
  encodings: ['br', 'gzip', 'deflate'],
  threshold: 1500,
};

/**
 * Single wiring point for response compression: main.ts and the e2e suite
 * register the plugin through this helper, so tests exercise the exact
 * production configuration.
 */
export async function registerHttpCompression(app: NestFastifyApplication): Promise<void> {
  await app.register(fastifyCompress, COMPRESSION_OPTIONS);
}
