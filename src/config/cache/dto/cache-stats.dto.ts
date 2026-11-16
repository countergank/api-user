import { ApiProperty } from '@nestjs/swagger';
import { CacheStats } from '../cache.service';

export class CacheStatsResponseDTO {
  @ApiProperty({ example: 1523, description: 'Cache reads that found a live entry since process start' })
  hits: number;

  @ApiProperty({ example: 87, description: 'Cache reads that found no live entry since process start' })
  misses: number;

  @ApiProperty({ example: 0.946, description: 'hits / (hits + misses); 0 when no reads yet' })
  hitRate: number;

  @ApiProperty({ example: 42, description: 'Live cache: keys currently stored in Redis' })
  size: number;

  @ApiProperty({ example: 5, description: 'Keys evicted by Redis due to maxmemory since Redis start' })
  evictions: number;

  constructor(stats: CacheStats) {
    this.hits = stats.hits;
    this.misses = stats.misses;
    this.hitRate = stats.hitRate;
    this.size = stats.size;
    this.evictions = stats.evictions;
  }

  static of(stats: CacheStats): CacheStatsResponseDTO {
    return new CacheStatsResponseDTO(stats);
  }
}
