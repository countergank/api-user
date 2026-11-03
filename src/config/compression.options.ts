import type { FastifyCompressOptions } from '@fastify/compress';

/**
 * Shared @fastify/compress registration options (PERF-11).
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
