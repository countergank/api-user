import { ApiProperty } from '@nestjs/swagger';

export class UserMetricsResponseDTO {
  @ApiProperty({ example: 1520, description: 'Users excluding soft-deleted ones (same rule as the list)' })
  total: number;

  @ApiProperty({ example: 1490, description: 'Users with isActive=true, excluding soft-deleted ones' })
  active: number;

  @ApiProperty({ example: 7, description: 'Users with lockedUntil in the future' })
  locked: number;

  @ApiProperty({ example: 23, description: 'Users still carrying an email verification token' })
  unverifiedEmail: number;

  @ApiProperty({ example: 58, description: 'Users created in the last 30 days, excluding soft-deleted ones' })
  newLast30Days: number;

  @ApiProperty({ example: 56, description: 'Users created between 30 and 60 days ago, excluding soft-deleted ones' })
  newPrevious30Days: number;

  constructor(counts: UserMetrics) {
    this.total = counts.total;
    this.active = counts.active;
    this.locked = counts.locked;
    this.unverifiedEmail = counts.unverifiedEmail;
    this.newLast30Days = counts.newLast30Days;
    this.newPrevious30Days = counts.newPrevious30Days;
  }

  static of(counts: UserMetrics): UserMetricsResponseDTO {
    return new UserMetricsResponseDTO(counts);
  }
}

/** Counts as returned by the aggregation, before the HTTP shape. */
export interface UserMetrics {
  total: number;
  active: number;
  locked: number;
  unverifiedEmail: number;
  newLast30Days: number;
  newPrevious30Days: number;
}
